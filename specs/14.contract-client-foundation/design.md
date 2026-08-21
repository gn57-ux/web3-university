# contract-client-foundation — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，前端（根目录 Next.js）新增 `lib/contracts/`，合约侧新增/扩展 `contracts/web3-university/script/`
- 涉及层: 前端（TypeScript/React/Viem）+ 智能合约部署脚本（Foundry）

## 架构决策：ABI/地址如何进入前端构建

| 维度 | 方案 A：前端构建时直接读 `contracts/web3-university/out/`（依赖本机 Foundry） | 方案 B：同步脚本把 ABI/地址提取为 TS/JSON 产物，提交到仓库 |
| --- | --- | --- |
| 可移植性 | 任何机器 `npm run build` 前必须先 `forge build`，CI/新同学 clone 后容易踩坑 | `npm install && npm run build` 即可，Foundry 只在"更新合约"时才需要 |
| 类型安全 | 需要额外写类型声明或运行时校验 `out/` JSON 结构 | ABI 提取时用 `as const` 导出，viem 的 `getContract`/`readContract` 能做到完整类型推断 |
| 变更可见性 | 合约变了，前端"悄悄"跟着变，diff 里看不出 ABI 实际变化 | ABI/地址文件本身进 git diff，合约签名变化在 PR 里一目了然 |
| 一致性风险 | 前端和合约必须永远在同一台机器同一份 `out/`，团队协作/CI 容易不同步 | 同步脚本是唯一权威生成路径，任何人跑一次就能得到确定结果，产物本身是"当前应该用哪份 ABI"的单一事实来源 |

**结论**：采用**方案 B**。理由：本项目前端和合约是两个独立发布节奏的子系统（合约已进入验收，前端才刚开始接入），方案 A 会让前端构建隐性依赖合约仓库的构建产物，一旦合约侧 `forge clean` 或者切换分支，前端会莫名其妙构建失败；方案 B 用显式同步脚本把"合约变了"这件事变成一次性、可 diff、可 review 的动作，且前端交付物（`npm run build` 产物）不再需要 Foundry 工具链。

## 模块 1：链定义与本地环境

`lib/contracts/chain.ts`：

```ts
import { defineChain } from "viem";

export const TARGET_CHAIN = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});
```

- 单一配置点：后续要切换到 Sepolia，只改这一个文件（把 `TARGET_CHAIN` 换成 `viem/chains` 的 `sepolia`），`useWallet.tsx`/`useContractClients.ts`/`addresses.ts` 均以 `TARGET_CHAIN`/`TARGET_CHAIN.id` 为准，不再各处硬编码链信息。
- 本阶段**不**实现"用户可选链"的 UI（不在需求范围内），`TARGET_CHAIN` 是编译期常量。

## 模块 2：ABI 同步

`scripts/sync-contract-abis.mjs`（Node 脚本，`npm run contracts:sync-abi`）：

- 读取 `contracts/web3-university/out/{Contract}.sol/{Contract}.json` 的 `.abi` 字段（5 个合约：`YDToken`/`YDFaucet`/`Web3University`/`CourseCertificate`/`DemoCompletionOracle`）。
- 写出 `lib/contracts/abis/{Contract}.ts`：`export const {Contract}Abi = [...] as const;`。
- 脚本本身幂等（重复运行结果一致），运行前提示"请先在 `contracts/web3-university/` 执行 `forge build`"（不在脚本内自动 `forge build`，避免前端脚本悄悄依赖 Foundry 可执行文件——保持方案 B 的边界清晰：合约构建永远由合约侧显式触发）。

## 模块 3：合约地址

`lib/contracts/addresses.ts`：

```ts
export const CONTRACT_ADDRESSES: Record<number, {
  YDToken: `0x${string}`;
  YDFaucet: `0x${string}`;
  Web3University: `0x${string}`;
  CourseCertificate: `0x${string}`;
  DemoCompletionOracle: `0x${string}`;
}> = {
  31337: { /* 由 scripts/sync-contract-addresses.mjs 写入 */ },
};
```

`scripts/sync-contract-addresses.mjs`（`npm run contracts:sync-addresses`）：解析 `contracts/web3-university/broadcast/DeployAll.s.sol/31337/run-latest.json` 里各 `CREATE` 交易的 `contractName`/`contractAddress`，写回 `addresses.ts` 对应 `chainId` 的字段。Anvil 用固定助记词（`--mnemonic` 传入固定测试助记词或使用其默认账户）+ 部署脚本固定的合约创建顺序，保证每次全新部署得到**相同**地址（CREATE 地址由部署者地址与 nonce 决定，两者都固定），因此地址产物可以提交到仓库、且长期有效，不需要每次开发者本地重跑 Anvil 都重新同步（除非部署脚本本身的合约创建顺序变化）。

## 模块 4：Viem 客户端

`lib/contracts/useContractClients.ts`：

```ts
export function useContractClients() {
  const { connected } = useWallet(); // 只借用登录态，不重复实现身份逻辑
  const wallets = useWallets();      // Privy 原生 Hook，直接读嵌入式钱包
  const embeddedWallet = wallets.wallets.find((w) => w.walletClientType === "privy");

  const publicClient = useMemo(
    () => createPublicClient({ chain: TARGET_CHAIN, transport: http() }),
    []
  );

  const walletClient = useMemo(() => {
    if (!connected || !embeddedWallet) return null;
    return createWalletClient({
      account: embeddedWallet.address as `0x${string}`,
      chain: TARGET_CHAIN,
      transport: custom(await embeddedWallet.getEthereumProvider()),
    });
  }, [connected, embeddedWallet]);

  return { publicClient, walletClient };
}
```

- `publicClient` 与登录状态无关，未登录也能读链上数据（如课程列表价格）；`walletClient` 仅在已登录且嵌入式钱包就绪时才非空，消费方（15/16 的业务 Hook）必须自行判空。
- 不把这个 Hook 的逻辑塞进 `useWallet.tsx`：`useWallet` 的职责是"我是谁、我登录了没有、我在哪条链"，`useContractClients` 的职责是"给我一个能读/写合约的客户端"——两者是不同层次的关注点，混在一起会让 `useWallet.tsx` 从"身份"膨胀成"身份+合约交互"的大杂烩模块。

## 模块 5：useWallet.tsx 网络检测改造

- `WalletNetwork` 从 `"sepolia" | "wrong-network" | null` 改为 `"correct" | "wrong-network" | null`（不再在类型名里绑定具体链名，因为"当前正确的链是哪条"现在是 `TARGET_CHAIN` 决定的可配置项）。
- 判定逻辑从 `embeddedWallet?.chainId === SEPOLIA_CAIP2` 改为 `embeddedWallet?.chainId === `eip155:${TARGET_CHAIN.id}``。
- `switchToSepolia()` 重命名为 `switchToTargetChain()`：这是必要的破坏性重命名（原名字面意义已经不准确，继续叫这个名字会误导后续维护者以为一定是切到 Sepolia），内部改为 `embeddedWallet.switchChain(TARGET_CHAIN.id)`。
- `TopNav.tsx`/`PurchasePanel.tsx` 里所有 `switchToSepolia`/"切换到 Sepolia" 字样同步改为 `switchToTargetChain`/`` `切换到 ${TARGET_CHAIN.name}` ``（不新写死"Anvil Local"字符串，直接引用 `TARGET_CHAIN.name`，将来换链文案自动跟着变）。
- Privy `PrivyProvider` 的 `defaultChain`/`supportedChains` 从固定 `sepolia` 改为 `TARGET_CHAIN`（当前即 Anvil Local）；`specs/10.wallet-auth-integration/design.md` 里"仅 Sepolia"的表述需要一并标注为"本阶段临时改为本地 Anvil，Sepolia 部署是后续里程碑"。

## 模块 6：统一错误与交易状态

`lib/contracts/txError.ts`：

```ts
export type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

export function toContractErrorMessage(error: unknown): string {
  // 用户拒签（Privy/viem UserRejectedRequestError）→ "已取消签名"
  // 自定义 error selector 匹配（如 InsufficientFaucetBalance）→ 对应中文提示
  // 其余：退化到 error.shortMessage / error.message，或通用兜底文案
}
```

- 复用 `useWallet.tsx` 已有的"错误必须是真实可见文本，不是只有 title 属性"这条 UI 经验（见 `specs/memory/mock-wallet-context-api.md`），本模块只负责"把错误变成一句中文"，具体展示位置（哪里用 toast、哪里用行内文案）由 15/16 的消费组件决定。
- 自定义 error selector 映射表按需在 15/16 实现具体业务 Hook 时补充对应条目（本 feature 只搭结构，不需要预先穷举所有未来才会用到的 error）。

## 模块 7：部署与种子脚本

- 扩展/新增 `contracts/web3-university/script/DeployAll.s.sol` 的本地广播变体（如 `DeployAllLocal.s.sol`，或给 `DeployAll.s.sol` 增加按环境变量 `ANVIL=true` 切换是否 `vm.startBroadcast()` 真实广播——**只允许指向 `http://127.0.0.1:8545`，不得读取任何非本地 RPC URL**）。
- 新增课程种子逻辑（同一脚本或独立 `script/SeedCourses.s.sol`）：Owner 把测试老师账户加入白名单，用 `lib/mock/fixtures.ts` 里 `mockCourses` 的顺序创建对应课程（`metadataURI` 字段存课程 `id` slug，如 `"solidity-101"`），随后 `approveCourse`+`setCourseActive`，保证部署完成后链上 `courseId=1,2,3` 依次对应固定的 slug——[[15.onchain-token-course-purchase]] 靠这个顺序做 slug↔courseId 映射，不需要额外链上查询遍历。

## 安全考虑

- Anvil 是本地临时链，其默认助记词派生的账户人尽皆知、无真实价值，仅用于本地开发环境，`.gitignore`/文档中明确注明不得把这套助记词用于任何真实网络。
- 部署/种子脚本硬编码 RPC 只能指向 `127.0.0.1`，不读取任何环境变量形式的外部 RPC URL 或私钥，避免脚本以后被误用于真实网络。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| ABI/地址进入前端的方式 | 同步脚本生成并提交产物（方案 B） | 见上文架构决策对比 |
| 合约客户端 Hook 位置 | 新建 `lib/contracts/useContractClients.ts`，不塞进 `useWallet.tsx` | 职责分离：身份 vs 合约交互是两个关注点 |
| 网络判定的链 | `TARGET_CHAIN` 可配置常量，当前指向 Anvil Local | 为将来切 Sepolia 留一个单一配置点，不是到处硬编码 |
| `switchToSepolia` 命名 | 重命名为 `switchToTargetChain` | 原名字面意义已不准确，继续沿用会误导 |
| 课程 slug↔courseId 映射 | 部署种子脚本按固定顺序创建，无需链上反查 | 简单、确定，避免额外索引层（The Graph 等）在 MVP 阶段的复杂度 |
