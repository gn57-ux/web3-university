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
import { mockCurrentUser } from "@/lib/mock/fixtures";
import { TARGET_CHAIN } from "@/lib/contracts/chain";

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
  ydBalance: number;
  setYdBalance: (amount: number) => void;
}

const TARGET_CHAIN_CAIP2 = `eip155:${TARGET_CHAIN.id}`;

// ydBalance/authError/isAuthenticating 是本 Provider 唯一需要自己维护的状态：ydBalance
// 继续是独立于真实钱包的 Mock 演示余额（不接入 YD 合约），authError/isAuthenticating
// 需要跨组件共享（比如从 Hero 发起的登录，TopNav 也要能同步看到 loading/错误），三者
// 都不能只是 useWallet() 内部的局部 useState——那样每个消费组件会各自持有一份互不
// 同步的状态。connected/address/network/login/logout/switchToTargetChain 则直接读 Privy
// 自身的全局状态，不需要再包一层 Context（PrivyProvider 内部已经是单例）。
interface MockLayerState {
  ydBalance: number;
  setYdBalance: (amount: number) => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  isAuthenticating: boolean;
  setIsAuthenticating: (value: boolean) => void;
  switchingNetwork: boolean;
  setSwitchingNetwork: (value: boolean) => void;
}

const MockLayerContext = createContext<MockLayerState | null>(null);

function MockLayerProvider({ children }: { children: ReactNode }) {
  const [ydBalance, setYdBalance] = useState(mockCurrentUser.ydBalance);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);

  const value = useMemo<MockLayerState>(
    () => ({
      ydBalance,
      setYdBalance,
      authError,
      setAuthError,
      isAuthenticating,
      setIsAuthenticating,
      switchingNetwork,
      setSwitchingNetwork,
    }),
    [ydBalance, authError, isAuthenticating, switchingNetwork]
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
    ydBalance,
    setYdBalance,
    authError,
    setAuthError,
    isAuthenticating,
    setIsAuthenticating,
    switchingNetwork,
    setSwitchingNetwork,
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
    setYdBalance,
  };
}
