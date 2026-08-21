"use client";

import { useWallets } from "@privy-io/react-auth";
import { useEffect, useMemo, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, type PublicClient, type WalletClient } from "viem";
import { useWallet } from "@/lib/wallet/useWallet";
import { LOCAL_ANVIL_CHAIN_ID, TARGET_CHAIN } from "@/lib/contracts/chain";

export interface ContractClients {
  /** 只读客户端，与登录状态无关，未登录也能读链上数据（如课程列表价格）。 */
  publicClient: PublicClient;
  /** 仅在已登录且嵌入式钱包就绪时才非空，消费方必须自行判空。 */
  walletClient: WalletClient | null;
}

// Anvil 即使以 --gas-price 0 --block-base-fee-per-gas 0 --disable-min-priority-fee
// 启动，eth_maxPriorityFeePerGas 仍会返回 1 gwei（面向真实钱包 UX 的固定建议值，不受
// 这些启动参数影响），而 TARGET_CHAIN 的 `fees.estimateFeesPerGas` 覆盖在实测中未被
// viem 的 writeContract 估费/估 gas 链路稳定采纳（怀疑与当前 viem 版本内部调用顺序
// 有关）——已用真实 writeContract 调用验证：只有在每次调用显式传入
// `maxFeePerGas: 0n, maxPriorityFeePerGas: 0n` 时，Privy 动态创建的零 ETH 余额钱包
// 才能成功发交易。用这个包装函数把"零费用默认值"下沉到唯一一处，15/16 未来所有的
// `walletClient.writeContract(...)` 调用不需要各自记得传这两个字段——调用方仍可在
// args 里显式覆盖（`{ ...ZERO_FEE_OVERRIDES, ...args }` 里 args 在后，优先级更高）。
// 只在 TARGET_CHAIN.id === LOCAL_ANVIL_CHAIN_ID 时才应用这个包装（见下方调用处）——
// 换成 Sepolia/主网后必须走正常估费，零费用是本地免 gas 演示专属行为，不能全局生效。
// 见 specs/14.contract-client-foundation/design.md「安全考虑」结构化复核 P1 记录。
const ZERO_FEE_OVERRIDES = { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n } as const;

function withZeroFeeDefaults(client: WalletClient): WalletClient {
  // viem 的 writeContract 是多重泛型重载签名，包装函数无法在保留完整类型推断的
  // 同时改写实现体（这是包装第三方库自身高度重载类型时的已知限制，不是本项目
  // 引入的建模缺陷）；对外暴露的签名仍是精确的 `WalletClient["writeContract"]`，
  // 调用方（15/16 的业务 Hook）拿到的类型检查不受影响，only 内部实现这一行需要
  // 放宽。
  const originalWriteContract = client.writeContract.bind(client);
  const zeroFeeWriteContract = ((args: Record<string, unknown>) =>
    originalWriteContract({
      ...ZERO_FEE_OVERRIDES,
      ...args,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as WalletClient["writeContract"];

  return { ...client, writeContract: zeroFeeWriteContract };
}

// 职责分离：useWallet 只管"我是谁、我登录了没有、我在哪条链"，本 Hook 只负责
// "给我一个能读/写合约的客户端"，两者是不同层次的关注点。
// 见 specs/14.contract-client-foundation/design.md 模块 4。
export function useContractClients(): ContractClients {
  const { connected } = useWallet();
  const { wallets } = useWallets();
  const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy");
  const embeddedWalletAddress = embeddedWallet?.address ?? null;

  const publicClient = useMemo<PublicClient>(
    () => createPublicClient({ chain: TARGET_CHAIN, transport: http() }),
    []
  );

  // embeddedWallet.getEthereumProvider() 是异步调用，不能直接在同步的 useMemo
  // 里 await；用 useEffect + useState 处理异步初始化，并在依赖变化/卸载时
  // 丢弃过期的初始化结果，避免竞态覆盖最新状态。
  //
  // 仅用 cancelled 标志阻止"过期的 setState 调用"还不够：账户切换时（A 登出/换成
  // B），旧 effect 的 cancelled 标志会被正确置位，但在新 effect 的异步初始化完成
  // 之前，state 里仍保留着上一次 setWalletClient 写入的、绑定账户 A 的旧
  // walletClient——这段窗口期内任何消费方读到的都是签名者错配的客户端（Codex
  // Review 结构化复核抓到的 P2）。修复：额外记录"当前这份 walletClient 是为哪个
  // 地址构建的"（walletClientAddress），返回给调用方前用当前 embeddedWalletAddress
  // 校验两者一致，不一致（哪怕 state 还没来得及更新）一律当作 null 处理——校验放在
  // 读取路径上，不依赖 setState 时序恰好正确。
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [walletClientAddress, setWalletClientAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!connected || !embeddedWallet) {
      // 与下方成功/失败分支保持一致的模式：setState 只在回调里调用，不在
      // effect 主体同步调用，避免触发级联渲染（react-hooks/set-state-in-effect）。
      queueMicrotask(() => {
        if (!cancelled) {
          setWalletClient(null);
          setWalletClientAddress(null);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const targetAddress = embeddedWallet.address;

    embeddedWallet
      .getEthereumProvider()
      .then((provider) => {
        if (cancelled) return;
        const client = createWalletClient({
          account: targetAddress as `0x${string}`,
          chain: TARGET_CHAIN,
          transport: custom(provider),
        });
        // 只在本地 Anvil 演示环境套用零费用包装：TARGET_CHAIN 换成 Sepolia/主网后
        // TARGET_CHAIN.id 不再等于 LOCAL_ANVIL_CHAIN_ID，这里自然退回不包装的原始
        // client，真实网络的写交易按正常流程估费，不会被强制 maxFeePerGas: 0
        // 卡死（Codex Review 结构化复核 P2，见 chain.ts 的 LOCAL_ANVIL_CHAIN_ID 说明）。
        setWalletClient(
          TARGET_CHAIN.id === LOCAL_ANVIL_CHAIN_ID ? withZeroFeeDefaults(client) : client
        );
        setWalletClientAddress(targetAddress);
      })
      .catch(() => {
        if (cancelled) return;
        setWalletClient(null);
        setWalletClientAddress(null);
      });

    return () => {
      cancelled = true;
    };
    // embeddedWallet 对象每次渲染引用可能变化，用地址（embeddedWalletAddress）
    // 代替它做依赖比较，避免每次渲染都重新触发异步初始化。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, embeddedWalletAddress]);

  const isWalletClientCurrent =
    connected && embeddedWalletAddress !== null && walletClientAddress === embeddedWalletAddress;

  return { publicClient, walletClient: isWalletClientCurrent ? walletClient : null };
}
