# onchain-token-course-purchase — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，扩展 [[14.contract-client-foundation]] 的 `lib/contracts/`
- 涉及层: 前端（React Hook + Viem 读写）

## 架构决策：链上状态如何进入 React（轮询/事件订阅 vs 手动 refetch-after-write）

| 维度 | 方案 A：`publicClient.watchContractEvent`/轮询区块自动刷新 | 方案 B：只在"用户自己发起的写操作确认后"手动 refetch，其余靠一次性读取 + 手动刷新按钮 |
| --- | --- | --- |
| 复杂度 | 需要管理订阅生命周期、防抖、多个页面各自订阅可能重复拉取 | 逻辑简单：写操作是 Promise 链，`await` 交易确认后重新读一次，天然是"因果明确"的一次性动作 |
| 实时性 | 能感知"别人"的链上变化（如另一个学生购买同一课程） | 感知不到他人操作，但本 MVP 的购买状态只跟"当前登录学生自己"相关，不需要感知他人 |
| 资源消耗 | 常驻订阅/轮询消耗 RPC 请求，本地 Anvil 无所谓，但为将来接 Sepolia/主网埋下不必要的开销习惯 | 只在真正需要时才发请求，天然节流 |
| 实现工作量 | 需要额外处理"组件卸载时取消订阅"等生命周期细节 | 与现有 `usePurchaseFlow` 的 Promise 式 `approve()`/`buy()` 接口形状天然吻合，改造量最小 |

**结论**：采用**方案 B**。理由：当前需求（F-004/F-005）只关心"当前登录学生自己的余额/购买状态"，不需要感知其他用户的链上活动；`usePurchaseFlow` 现有的 Mock 实现本来就是"发起操作 → 等待 → 得到确定性结果"的 Promise 形状，方案 B 与之改造成本最低，且避免为 MVP 阶段不需要的实时性引入订阅生命周期管理的复杂度。

## 模块 1：余额读取（替换 `useWallet.ydBalance`）

- `useWallet.tsx` 移除本地 `ydBalance`/`setYdBalance` 的 `useState` 实现；`WalletState` 改为提供 `ydBalance: number`（只读，来自链上）与 `refetchYdBalance(): Promise<void>`（写操作确认后调用，触发重新读取）。
- 具体读取放在新的 `lib/purchase/useOnchainBalance.ts`（不是塞进 `useWallet.tsx`——余额读取是"合约交互"关注点，见 [[14.contract-client-foundation]] 的职责分离原则），内部用 `publicClient.readContract({ address: YDTokenAddress, abi: YDTokenAbi, functionName: "balanceOf", args: [address] })`，`useEffect` 依赖 `[address, refetchTrigger]`。
- `useWallet()` 内部组合 `useOnchainBalance()` 的结果暴露给消费方，保持"消费方只认 `wallet.ydBalance`"这个既有心智模型不变（[[10.wallet-auth-integration]] 交付的 4 个消费点：`TopNav`/`ProfileHeader`/`PurchasePanel`/`usePurchaseFlow`，都不需要改动读取字段的方式，只是这个字段现在是真的）。
- **修订记录（结构化复核发现）**：初版实现把 `useOnchainBalance(address)` 直接放进 `useWallet()` 函数体内调用，违反了 [[10.wallet-auth-integration]] design.md 早就确立的原则——"需要跨组件共享的状态不能是 `useWallet()` 内部的局部 Hook 调用，那样每个消费组件会各自持有一份互不同步的状态"。后果：`PurchasePanel` 和 `usePurchaseFlow` 各自的 `useWallet()` 调用建出两份独立的余额状态，Faucet 领取成功后只刷新了发起领取那个组件实例的余额，`usePurchaseFlow` 消费的另一份仍是领取前的旧值，购买状态机永远卡在 `insufficient-balance`。修复：`useOnchainBalance` 改为只在 `MockLayerProvider`（`useWallet.tsx` 内部已有的共享状态 Provider）里调用一次，`ydBalance`/`refetchYdBalance` 通过 Context 分发，与 `authError`/`switchingNetwork` 等既有共享字段用同一套机制。

## 模块 2：Faucet 领取

`lib/purchase/useFaucetClaim.ts`：

```ts
export function useFaucetClaim() {
  const { walletClient, publicClient } = useContractClients();
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (!walletClient) return;
    setStatus("signing"); setError(null);
    try {
      const hash = await walletClient.writeContract({ address: FaucetAddress, abi: YDFaucetAbi, functionName: "claim" });
      setTxHash(hash);
      setStatus("pending");
      await publicClient.waitForTransactionReceipt({ hash });
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(toContractErrorMessage(e));
    }
  }

  return { claim, status, txHash, error };
}
```

- `PurchasePanel.tsx` 的"insufficient-balance"分支改用这个 Hook；领取成功后调用 `wallet.refetchYdBalance()`（模块 1）刷新余额，购买流程的 `state` 派生（模块 4）会自动因为余额变化而重新计算。

## 模块 3：两阶段购买（授权 + 购买）

`usePurchaseFlow.ts` 保留现有的 `PurchaseState` 派生框架（`wallet-disconnected`/`wrong-network`/`insufficient-balance`/`needs-approval`/`approving`/`ready-to-buy`/`buying`/`purchased`），但底层数据来源改变：

- `allowance` 改为 `publicClient.readContract({ functionName: "allowance", args: [student, web3UniversityAddress] })`。
- `hasPurchased` 改为 `publicClient.readContract({ functionName: "hasPurchased", args: [courseId, student] })`。
- `approve()`：`walletClient.writeContract({ functionName: "approve", args: [web3UniversityAddress, price] })` → `waitForTransactionReceipt` → 重新读 `allowance`。
- `buy()`：`walletClient.writeContract({ functionName: "buyCourse", args: [courseId] })` → `waitForTransactionReceipt` → 重新读 `hasPurchased`/`purchaseOf`/`ydBalance`。
- `state` 的 `needs-approval`/`ready-to-buy`/`purchased` 三档不再是本地 `useState` 布尔值，而是纯函数：`allowance >= price` → `ready-to-buy`；`hasPurchased` → `purchased`；否则 `needs-approval`。`approving`/`buying` 两档仍是本地 `TxStatus === "signing" | "pending"` 的即时 UI 反馈（这两档天生就是"交易还没确认"的瞬时状态，不适合、也不需要从链上读）。
- `courseId`：新增 `lib/contracts/courseIdMap.ts`，按 [[14.contract-client-foundation]] 部署种子脚本实际创建的顺序，硬编码 `{ "solidity-101": 1n, "web3-dapp-from-zero": 2n, "defi-uniswap-practical": 3n }`（与 `lib/mock/fixtures.ts` 的 `mockCourses` 数组顺序一致；此处顺序在实现阶段用 `cast call courses(uint256)` 对真实链上 `metadataURI` 字段逐一核对过，不是凭假设照抄本段落早前版本的示意映射）。
- **修订记录（结构化复核发现）**：`courseId`/账户切换时，`allowance`/`hasPurchased` 的旧值不会立即清空，只在新读取完成后才更新——若新读取失败（RPC 错误），`catch` 分支只设置 `readError`，但 `state` 派生优先判断 `hasPurchased` 是否为 `true`（旧值），导致切到新课程/新账户后仍短暂甚至永久展示上一个查询键的 `purchased` 状态。修复：`courseId`/`wallet.address` 变化触发的读取 `useEffect` 里，在发起新读取**之前**立即把 `allowance`/`hasPurchased` 重置为 `null`（复用已有的 `queueMicrotask` 模式），让 `state` 派生落到显式的 `loading` 档位，不会残留旧查询键的结果。

## 模块 4：购买记录展示

- 课程详情页购买信息（价格/购买时间/交易哈希——交易哈希在链上 `Purchase` struct 里没有存，`purchaseOf` 只有 `purchasedAt`；交易哈希改为购买成功那一刻 `buy()` 返回的 `hash` 存进组件本地状态展示"最近一次操作"的哈希，不作为持久化字段，历史交易哈希查询不在本 feature 范围）。
- **修订记录（结构化复核发现）**：初版 `usePurchaseFlow.ts` 只查询 `hasPurchased`，`state === "purchased"` 时课程详情页展示的是传入的 `priceYD`（课程 fixture 展示价），不是链上 `purchaseOf(courseId, student)` 记录的实际支付价格/购买时间，遗漏了 requirements.md 明确要求的"课程详情通过 `purchaseOf` 展示链上真实购买信息"这条验收项。修复：`readOnchainState` 与 `allowance`/`hasPurchased` 一起并行读取 `purchaseOf`（未购买时该 mapping 返回全零值，不会 revert，无条件一起读取比"先查 hasPurchased 再决定要不要查"少一次串行往返），`usePurchaseFlow` 新增 `purchaseRecord: { pricePaidYD, purchasedAt } | null` 字段，`PurchasePanel.tsx` 的"已购买"分支展示这份链上真实数据。
- 个人中心"已购课程"/"购买记录" Tab：`lib/purchase/useOnchainPurchases.ts` 对已知的 3 个种子 `courseId`（模块 3 的映射表）逐一查询 `hasPurchased`/`purchaseOf`，过滤出已购买的，映射回 `MockPurchaseRecord` 形状（复用现有类型，字段来源换成链上读取，`txHash` 字段留空或标注"链上记录无历史哈希"，不假造一个不存在的哈希）。
- `lib/mock/purchaseStore.ts` 整个文件删除，`LearningCenter.tsx`/`usePurchaseFlow.ts`/`useProfilePurchases.ts` 里对它的引用全部替换为上述链上读取 Hook。
- **修订记录（结构化复核发现，三处相关问题一并记录）**：
  1. `useOnchainPurchases.ts` 账户切换（A→B）时，`purchases` 数组不会立即清空，只在 B 的读取完成后才更新；各 Tab 组件只在数组为空时展示 loading 骨架，导致 B 短暂（读取失败时是永久）看到 A 的课程和购买时间。修复：与模块 3 的课程/账户切换清空逻辑同构——账户变化时立即清空 `purchases`，落到显式 loading。
  2. `LearningCenter.tsx` 的购课门禁读取（`hasPurchased`）最初把"读取失败"和"未购买"归并成同一个结果，导致一次 RPC 抖动就会把已购买用户拦在购课引导页外，且没有重试入口。修复：`purchaseCheck` 状态从 `{checking, purchased}` 改为显式的 `"checking" | "purchased" | "not-purchased" | "error"`，`"error"` 态展示具体错误信息和"重试"按钮。
  3. 个人中心三个消费 `useOnchainPurchases`（经 `useProfilePurchases` 透传）的 Tab（`PurchasedCoursesTab`/`PurchaseRecordsTab`/`LearningProgressTab`）最初都丢弃了 Hook 已经暴露的 `error` 字段，读取失败时数组为空、`loading` 变 false，页面错误地展示"暂无已购课程/购买记录/学习进度"，用户会误以为自己真的什么都没买。修复：三个 Tab 都新增 `error` 分支，读取失败时展示具体错误信息而不是"暂无"。
- **修订记录（结构化复核发现）**：`PurchasePanel.tsx` 最初虽然从 `usePurchaseFlow` 拿到了 `lastApproveTxHash`/`lastBuyTxHash`，但组件里没有实际渲染，用户完成授权/购买后看不到任何交易哈希，遗漏 requirements.md F-004（"每一步链上操作都要展示交易哈希"）。修复：授权/购买/已购买三个状态分支都新增交易哈希展示（截断显示 + `title` 属性给出完整哈希）。
- **修订记录（结构化复核发现，第二轮，两处相关问题一并记录）**：
  1. `useOnchainBalance.ts` 的 `refetchYdBalance()` 是异步的，且 `ydBalance` 现在是跨组件共享的 Context 状态（模块 1 的修订记录）——账户 A 发起刷新、等待确认期间切换到账户 B，A 的读取结果完成时会无条件写入共享状态，覆盖 B 当前应该看到的真实余额，且不会被任何后续操作自动纠正。修复：与 `usePurchaseFlow.ts` 的 `latestAddressRef` 同一模式，`refetchYdBalance` 内部捕获发起请求时的地址，完成时比对当前最新地址，不一致则丢弃结果。
  2. `usePurchaseFlow.ts` 账户/课程切换时最初只清空了 `allowance`/`hasPurchased`/`readError`，没有清空 `approveStatus`/`buyStatus`/两类交易错误/两个交易哈希——账户 A 完成过一次授权/购买后切换到账户 B，B 会看到 A 遗留的交易哈希；若切换发生在 A 的交易待确认期间，B 的面板还会被卡在 `approving`/`buying`。修复：账户/课程切换清空逻辑里一并重置这些"当前账户这一次会话"的瞬时状态。
- **修订记录（结构化复核发现，第三轮，三处相关问题一并记录）**：
  1. `useOnchainBalance.ts` 的账户切换读取 `useEffect`（第二轮修复只处理了 `refetchYdBalance()` 这个手动刷新入口）本身没有在新地址的读取完成前清空上一个账户的 `ydBalance`——账户 A 切到账户 B 后，B 会先看到 A 的余额，且如果 B 的读取恰好失败，`catch` 分支"保留旧值"的兜底策略会让 A 的余额永久滞留在 B 名下，购买流程的 `insufficient-balance` 判断也会用错账户。修复：地址变化时先用已有的 `queueMicrotask` 模式把 `ydBalance` 清零，再发起新账户的读取，与 `usePurchaseFlow.ts` 清空 `allowance`/`hasPurchased` 的既有模式保持一致。
  2. `usePurchaseFlow.ts` 的 `refetchOnchainState()` 内部只是简单转发 `readOnchainState(wallet.address)` 的结果，没有在自己的 `await` 完成后重新校验账户是否仍然一致——调用方（`approve()`/`buy()`）在调用前的账户校验只能保证"调用发起时"账户没变，`refetchOnchainState` 内部再等一次 RPC 往返期间账户仍可能切换，届时会把账户 A 的读取结果无条件提交为账户 B 当前应该看到的 `allowance`/`hasPurchased`/`purchaseRecord`。修复：`refetchOnchainState` 内部捕获发起读取时的地址，`await` 完成后用 `latestAddressRef` 重新比对，不一致则丢弃结果，不提交任何 state。
  3. `approve()`/`buy()` 在 `writeContract`/`waitForTransactionReceipt` 之后的每一步 `setState`（写入交易哈希、`pending`/`success`/`error` 状态）都是无条件执行的——账户切换 effect 会重置 `approveStatus`/`buyStatus` 等瞬时状态（第二轮修复），但如果切换发生在授权/购买的中间某个 `await` 期间，旧账户 A 的异步调用完成时仍会继续无条件 `setState`，把 A 的交易哈希/状态重新写回已经属于账户 B 的会话，第二轮的重置形同虚设。修复：每一步 `setState` 之前都用 `latestAddressRef` 与发起时捕获的 `startAddress` 比对（`isStale()` 辅助函数），不一致就静默丢弃这次 UI 更新——交易本身已经广播上链，只是不再对已经切走的当前账户可见。
- **修订记录（结构化复核发现，第四轮，三处相关问题一并记录）**：
  1. `useFaucetClaim.ts` 之前完全没有账户感知——不重置状态，也不校验异步回调对应哪个账户。账户 A 发起领取后若在签名或确认期间切换到账户 B，A 的交易哈希、`pending`/`success`/`error` 会继续写入已经属于 B 的会话；B 可能被 A 的旧 `pending` 状态挡住领取按钮，或看到 A 的错误。修复：引入与 `usePurchaseFlow.ts` approve()/buy() 同一套 `latestAddressRef` + `isStale()` 防护，并新增账户切换时重置瞬时状态的 `useEffect`（`queueMicrotask` 包裹，遵守 `react-hooks/set-state-in-effect`）。
  2. `useOnchainBalance.ts` 的 `refetchYdBalance()`（以及挂载/账户切换的读取 `useEffect`）之前把 `balanceOf` 读取失败静默吞掉、不抛出也不设置任何错误标记——Faucet 领取成功后 `PurchasePanel` 依赖这次刷新推进购买状态机，一旦刷新本身失败，用户会永久停留在旧余额（甚至"余额不足"），除非整页刷新，否则再次点击领取只会拿到 `AlreadyClaimed`，没有任何提示告诉用户发生了什么。修复：新增 `balanceError` 字段（成功时清空、失败时设置为 `toContractErrorMessage(e)`），通过 `useWallet.tsx` 的 `MockLayerContext` 透传给 `WalletState`，`PurchasePanel.tsx` 在余额不足分支新增独立于 `faucet.error`（领取本身的错误）的展示行。
  3. `LearningCenter.tsx` 的购课门禁读取效果里，账户/课程切换后清空/更新 `purchaseCheck` 用的是 `queueMicrotask`（遵守 `react-hooks/set-state-in-effect`），但 React 在这次微任务执行前会先用旧查询键的 `purchaseCheck.status` 同步渲染一帧——如果上一个账户/课程已购买，这一帧会把完整课程内容（视频区、代码示例）渲染出来，哪怕新的账户/课程实际未购买。修复：`purchaseCheck` 状态里额外记录产生这次结果的查询键（`key`），渲染时把当前 `${address}::${courseId}` 与 `purchaseCheck.key` 做同步比对，不一致就在渲染期（不等 effect 的微任务）直接按 `checking` 处理，不依赖 effect 时机。
- **修订记录（结构化复核发现，第五轮，四处相关问题一并记录）**：
  1. `usePurchaseFlow.ts` 的 `state` 派生之前只检查 `allowance`/`hasPurchased` 是否读完，没有检查 `walletClient` 是否已经初始化好——只读链上状态（`readOnchainState`）可能先于 `getEthereumProvider()`（`useContractClients.ts`）完成，此时 `state` 会落到 `needs-approval`/`ready-to-buy`，`TwoPhaseTxButton` 的按钮显示成可点击，但 `approve()`/`buy()` 内部的 `!walletClient` 判空会让点击静默什么都不做，用户既没有错误提示也没有恢复入口。修复：`state` 派生新增 `if (!walletClient) return "loading"` 检查，与"链上数据还没读完"归为同一类"还不能交易"的过渡态，复用已有的 `loading` 档位。
  2. `usePurchaseFlow.ts` 之前用四个独立的 `useState`（`allowance`/`hasPurchased`/`purchaseRecord`/`readError`）保存链上读取结果，账户/课程切换时虽然用 `queueMicrotask` 清空，但和 `LearningCenter.tsx` 第四轮踩过的同一个问题一样——React 在微任务提交前会先用旧查询键的结果同步渲染一帧，例如从"已购课程 A"切到"未购课程 B"会先渲染出 A 的 `purchased` 态和购买信息。修复：仿照 `LearningCenter.tsx` 的 `effectiveStatus` 方案，把四个字段合并成一个带查询键（`key`）的 `readState` 对象，渲染时把当前 `${wallet.address}::${courseId}` 与 `readState.key` 同步比对，不一致就当作"尚未读取"（`allowance`/`hasPurchased` 为 `null`），自然落到已有的 `loading` 档位。
  3. `PurchasePanel.tsx` 的 `state === "purchased"` 分支之前只渲染 `lastBuyTxHash`，购买成功后本次会话之前看到的 `lastApproveTxHash` 就从 UI 上消失了，不满足 requirements.md F-004"每一步链上操作都要展示交易哈希"。修复：`purchased` 分支同时渲染 `lastApproveTxHash` 和 `lastBuyTxHash`。
  4. `PurchasePanel.tsx` 只在 `insufficient-balance` 分支展示 `wallet.balanceError`（第四轮新增）——购买确认后 `buy()` 内部会调用 `wallet.refetchYdBalance()` 刷新头部余额，这次刷新可能单独失败，但购买状态已经进入 `purchased`，`balanceError` 没有对应的展示位，用户看不到任何失败提示，头部余额停留在购买前的旧值。修复：`purchased` 分支也展示 `wallet.balanceError`。
- **修订记录（结构化复核发现，第六轮，两处相关问题一并记录）**：
  1. `usePurchaseFlow.ts` 的余额门禁之前用 `requiredBalanceYD`（课程 fixture 里一个独立的展示字段，例如 solidity-101 的 `requiredBalanceYD` 是 20）判断是否余额不足，但这门课链上真实价格只有 4 YD——领取一次 Faucet（20 YD）后先买了别的课程，剩余余额明明够买这门课，却会被 `requiredBalanceYD` 误判为余额不足；再次领取又必然遇到 `AlreadyClaimed`，购买顺序不同就可能永久买不到某些课程（P1，可复现的资金/购买逻辑错误）。修复：门禁判断改用 `priceYD`——与 `approve()`/`buy()` 实际构造交易时用的同一个价格来源（`priceWei` 由 `priceYD` 算出），门禁和交易执行必须依据同一个价格，不能有两套。`requiredBalanceYD` 不再传入 `usePurchaseFlow`（已从函数签名移除），仅作为 `PurchasePanel.tsx` 的展示文案参数保留。
  2. `useOnchainPurchases.ts` 的 `loading` 初始值是 `false`，只在 effect 的 `queueMicrotask` 里才变 `true`——已登录用户首次打开个人中心会先看到 `loading: false` 且 `purchases` 为空的一帧，被下游 Tab 组件误判为"暂无已购课程/购买记录/学习进度"；账户切换时同理会先提交一帧上一账户的旧数据。修复：与 `usePurchaseFlow.ts`/`LearningCenter.tsx` 同一套查询键方案，`purchases`/`loading`/`error` 合并进一个带 `key` 的状态对象，渲染时按当前地址与 `key` 同步比对，不一致就统一按 `loading: true` 处理。

## 安全考虑

- 所有写操作（`claim`/`approve`/`buyCourse`）必须经过 Privy 嵌入式钱包签名确认，前端不能绕过签名直接构造已签名交易。
- 交易确认前的中间态（`signing`/`pending`）必须在 UI 上明确区分"已提交等待确认"和"已确认成功"，不允许用户在交易还没上链时就看到"已购买"这种最终态提示（PRD 11.2 的强约束）。
- `allowance`/`hasPurchased` 等读取失败（RPC 错误）时，`state` 不应该默认落到某个"看起来正常"的档位掩盖错误——需要一个显式的"读取失败"展示态（复用 `authError`/`toContractErrorMessage` 的错误展示模式）。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 链上状态刷新方式 | 手动 refetch-after-write（方案 B） | 见上文架构决策对比 |
| `ydBalance` 归属 | 仍暴露在 `wallet.ydBalance`，但读取逻辑移到 `lib/purchase/useOnchainBalance.ts` | 消费方心智模型不变，读取实现职责分离 |
| courseId 映射 | 硬编码 slug→courseId 表，来自部署种子脚本的固定顺序 | MVP 阶段课程数量固定已知，避免引入事件索引器 |
| 购买记录交易哈希 | 只展示"本次操作"的哈希，不持久化历史哈希查询 | `Purchase` 合约结构未存哈希，链上事件历史查询超出本 feature 范围 |
