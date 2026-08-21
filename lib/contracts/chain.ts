import { defineChain } from "viem";

// 当前阶段唯一的链上目标：本地 Anvil。后续切换到 Sepolia 只需改这一处配置
// （把 TARGET_CHAIN 换成 viem/chains 的 sepolia），useWallet.tsx/
// useContractClients.ts/addresses.ts 均以 TARGET_CHAIN/TARGET_CHAIN.id 为准，
// 不再各处硬编码链信息。见 specs/14.contract-client-foundation/design.md 模块 1。
//
// 零 gas 成本说明（Privy 动态创建的学生嵌入式钱包默认零 ETH 余额，见 design.md
// 「安全考虑」）：曾尝试在这里用 `fees.estimateFeesPerGas` 覆盖 maxFeePerGas/
// maxPriorityFeePerGas 为 0，经真实 writeContract 调用验证无效——当前 viem 版本
// 的 writeContract 估费/估 gas 链路并未稳定采纳这个链级覆盖，仍会读到 Anvil
// 默认建议的 1 gwei 优先费导致零余额账户交易失败。真正有效的修复在
// `useContractClients.ts` 的 `withZeroFeeDefaults`：在每次 `writeContract` 调用时
// 显式注入零费用参数，不依赖链级配置。
export const TARGET_CHAIN = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

// 本地 Anvil 链 ID，写死在这里（而非直接用 TARGET_CHAIN.id）是有意的：`useContractClients.ts`
// 的 `withZeroFeeDefaults` 用它判断"当前是不是本地免 gas 演示环境"，只在这个专属场景下才
// 应用零费用包装——TARGET_CHAIN 换成 Sepolia 后这个判断结果自然变为 false，零费用包装
// 不再生效，真实网络的写交易走正常估费流程，不会因为 maxFeePerGas: 0 永远卡在待确认状态
// （Codex Review 结构化复核抓到的 P2：零费用包装此前无条件套用在任何 TARGET_CHAIN 上，
// 破坏了 requirements.md 承诺的"换链只改这一处配置"）。
export const LOCAL_ANVIL_CHAIN_ID = 31337;
