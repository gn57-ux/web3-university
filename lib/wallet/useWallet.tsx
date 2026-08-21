"use client";

import {
  PrivyProvider,
  usePrivy,
  useWallets,
  useLogin,
  useLogout,
} from "@privy-io/react-auth";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TARGET_CHAIN } from "@/lib/contracts/chain";
import { useOnchainBalance } from "@/lib/purchase/useOnchainBalance";

export type WalletNetwork = "correct" | "wrong-network" | null;

export interface WalletState {
  connected: boolean;
  /** Privy SDK 尚未初始化完成，或一次登录正在进行中（modal 打开到 onComplete/onError 之间）。 */
  loading: boolean;
  /** 一次 switchToTargetChain() 调用正在进行中，用于单独禁用切网按钮，避免并发重复调用。 */
  switchingNetwork: boolean;
  address: string | null;
  network: WalletNetwork;
  authError: string | null;
  login: () => void;
  logout: () => Promise<void>;
  switchToTargetChain: () => Promise<void>;
  /** `YDToken.balanceOf(address)` 的真实链上余额，见 `lib/purchase/useOnchainBalance.ts`。
   *  `balanceLoading` 为 `true` 或 `balanceError` 非空时不代表确认的真实余额。 */
  ydBalance: number;
  /** 余额是否正在读取中，见 `useOnchainBalance.ts`。 */
  balanceLoading: boolean;
  /** 写操作（Faucet 领取/授权/购买）确认后调用，触发重新读取链上余额。 */
  refetchYdBalance: () => Promise<void>;
  /** 最近一次余额刷新失败的原因；成功后自动清空，见 `useOnchainBalance.ts`。 */
  balanceError: string | null;
}

const TARGET_CHAIN_CAIP2 = `eip155:${TARGET_CHAIN.id}`;

// authError/isAuthenticating/switchingNetwork/ydBalance/refetchYdBalance 都需要
// 跨组件共享（比如从 Hero 发起的登录，TopNav 也要能同步看到 loading/错误；
// PurchasePanel 里 Faucet 领取成功后调用 refetchYdBalance，usePurchaseFlow 的
// state 派生也要看到刷新后的新余额），不能只是 useWallet() 内部的局部
// useState/局部 Hook 调用——那样每个消费组件会各自持有一份互不同步的状态。
// ydBalance 最初（Feature 15 实现阶段）错误地把 `useOnchainBalance(address)`
// 直接放进 useWallet() 函数体内调用，导致 PurchasePanel 和 usePurchaseFlow
// 各自的 useWallet() 调用各建出一份独立的余额状态——PurchasePanel 触发
// Faucet 领取后只刷新了它自己那份，usePurchaseFlow 消费的另一份仍是领取前的
// 旧值，状态机永远卡在 insufficient-balance（Codex Review 结构化复核抓到的
// P1）。修复：`useOnchainBalance` 只在 MockLayerProvider 里调用一次，结果通过
// Context 分发，恢复"共享状态放在 Provider 层"这条已经在 Feature 10 验证过的
// 原则。connected/address/network/login/logout/switchToTargetChain 仍直接读
// Privy 自身的全局状态，不需要再包一层 Context（PrivyProvider 内部已经是单例）。
interface MockLayerState {
  authError: string | null;
  setAuthError: (error: string | null) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (value: boolean) => void;
  switchingNetwork: boolean;
  setSwitchingNetwork: (value: boolean) => void;
  ydBalance: number;
  balanceLoading: boolean;
  refetchYdBalance: () => Promise<void>;
  balanceError: string | null;
}

const MockLayerContext = createContext<MockLayerState | null>(null);

function MockLayerProvider({ children }: { children: ReactNode }) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  // Privy 自身已是全局单例状态，MockLayerProvider 直接读一次即可得到当前登录
  // 地址，不需要额外传参——与 useWallet() 内部推导 address 的方式一致。
  const { wallets } = useWallets();
  const embeddedWalletAddress =
    wallets.find((wallet) => wallet.walletClientType === "privy")?.address ?? null;
  const { ydBalance, balanceLoading, refetchYdBalance, balanceError } =
    useOnchainBalance(embeddedWalletAddress);

  const value = useMemo<MockLayerState>(
    () => ({
      authError,
      setAuthError,
      isAuthenticating,
      setIsAuthenticating,
      switchingNetwork,
      setSwitchingNetwork,
      ydBalance,
      balanceLoading,
      refetchYdBalance,
      balanceError,
    }),
    [
      authError,
      isAuthenticating,
      switchingNetwork,
      ydBalance,
      balanceLoading,
      refetchYdBalance,
      balanceError,
    ]
  );

  return <MockLayerContext.Provider value={value}>{children}</MockLayerContext.Provider>;
}

function useMockLayer(): MockLayerState {
  const ctx = useContext(MockLayerContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim() !== "") return error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    // 缺少 App ID 时明确报错，不得静默用假值渲染——真实身份层没有"假值兜底"这个选项。
    throw new Error(
      "缺少 NEXT_PUBLIC_PRIVY_APP_ID 环境变量，请在 .env.local 中配置（参考 .env.example，前往 https://dashboard.privy.io/ 创建应用获取）。"
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: TARGET_CHAIN,
        supportedChains: [TARGET_CHAIN],
        appearance: { theme: "dark", accentColor: "#7c3aed" },
      }}
    >
      <MockLayerProvider>{children}</MockLayerProvider>
    </PrivyProvider>
  );
}

export function useWallet(): WalletState {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const {
    authError,
    setAuthError,
    isAuthenticating,
    setIsAuthenticating,
    switchingNetwork,
    setSwitchingNetwork,
    ydBalance,
    balanceLoading,
    refetchYdBalance,
    balanceError,
  } = useMockLayer();

  const { login: privyLogin } = useLogin({
    onComplete: () => {
      setIsAuthenticating(false);
      setAuthError(null);
    },
    onError: (error) => {
      setIsAuthenticating(false);
      setAuthError(toErrorMessage(error, "登录失败，请重试。"));
    },
  });

  // useLogout 的 callbacks 只有 onSuccess（这个 SDK 版本没有 onError），失败情况用
  // logout() 包装函数自己的 try/catch 兜底。
  const { logout: privyLogout } = useLogout({
    onSuccess: () => setAuthError(null),
  });

  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
  const connected = ready && authenticated;
  const address = embeddedWallet?.address ?? null;
  const network: WalletNetwork = !connected
    ? null
    : embeddedWallet?.chainId === TARGET_CHAIN_CAIP2
      ? "correct"
      : "wrong-network";

  const login = useCallback(() => {
    setAuthError(null);
    setIsAuthenticating(true);
    privyLogin();
  }, [privyLogin, setAuthError, setIsAuthenticating]);

  const logout = useCallback(async () => {
    try {
      await privyLogout();
    } catch (error) {
      setAuthError(toErrorMessage(error, "退出登录失败，请重试。"));
    }
  }, [privyLogout, setAuthError]);

  const switchToTargetChain = useCallback(async () => {
    if (!embeddedWallet || switchingNetwork) return;
    setSwitchingNetwork(true);
    try {
      await embeddedWallet.switchChain(TARGET_CHAIN.id);
      setAuthError(null);
    } catch (error) {
      setAuthError(toErrorMessage(error, "切换网络失败，请重试。"));
    } finally {
      setSwitchingNetwork(false);
    }
  }, [embeddedWallet, switchingNetwork, setSwitchingNetwork, setAuthError]);

  return {
    connected,
    loading: !ready || isAuthenticating,
    switchingNetwork,
    address,
    network,
    authError,
    login,
    logout,
    switchToTargetChain,
    ydBalance,
    balanceLoading,
    refetchYdBalance,
    balanceError,
  };
}
