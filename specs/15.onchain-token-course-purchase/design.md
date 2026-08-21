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
- `courseId`：新增 `lib/contracts/courseIdMap.ts`，按 [[14.contract-client-foundation]] 部署种子脚本约定的固定顺序，硬编码 `{ "solidity-101": 1n, "defi-uniswap-practical": 2n, "web3-dapp-from-zero": 3n }`（单一事实来源，`usePurchaseFlow(courseId: string, ...)` 内部转换为链上 `bigint` courseId）。

## 模块 4：购买记录展示

- 课程详情页购买信息（价格/购买时间/交易哈希——交易哈希在链上 `Purchase` struct 里没有存，`purchaseOf` 只有 `purchasedAt`；交易哈希改为购买成功那一刻 `buy()` 返回的 `hash` 存进组件本地状态展示"最近一次操作"的哈希，不作为持久化字段，历史交易哈希查询不在本 feature 范围）。
- 个人中心"已购课程"/"购买记录" Tab：`lib/purchase/useOnchainPurchases.ts` 对已知的 3 个种子 `courseId`（模块 3 的映射表）逐一查询 `hasPurchased`/`purchaseOf`，过滤出已购买的，映射回 `MockPurchaseRecord` 形状（复用现有类型，字段来源换成链上读取，`txHash` 字段留空或标注"链上记录无历史哈希"，不假造一个不存在的哈希）。
- `lib/mock/purchaseStore.ts` 整个文件删除，`LearningCenter.tsx`/`usePurchaseFlow.ts`/`useProfilePurchases.ts` 里对它的引用全部替换为上述链上读取 Hook。

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
