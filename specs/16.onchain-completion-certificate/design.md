# onchain-completion-certificate — 技术设计

## 设计版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-08-20 | v1 | 初始设计 |

## 项目架构

- 架构类型: 单体仓库，新增一个 Next.js Route Handler（服务端），扩展 `lib/purchase`/个人中心组件
- 涉及层: 前端（React）+ Next.js 服务端路由（不是独立后端服务，也不是数据库）

## 架构决策：受信任提交者私钥放在哪

| 维度 | 方案 A：开发者本地手动跑一个 Node CLI 脚本触发确认 | 方案 B：Next.js Route Handler（服务端）持有本地测试私钥，前端调用 API 触发 |
| --- | --- | --- |
| 与 PRD 架构的吻合度 | PRD 描述的是"可信管理员或后端预言机地址提交完成状态"——CLI 脚本不是"后端"，只是开发者手动操作 | 与 PRD 描述的角色（受信任后端）在形状上一致，`app/api/` 路由本来就跑在 Node.js 服务端运行时，天然是"私钥不出现在浏览器"的正确位置 |
| 用户体验 | 演示/QA 时需要额外开一个终端手动敲命令，容易忘记步骤、流程不闭环 | 学习中心页面上一个"确认完成"按钮直接触发，端到端体验完整 |
| 私钥暴露面 | 私钥只存在于开发者本机终端/脚本参数里，不进 Next.js 进程 | 私钥作为**非 `NEXT_PUBLIC_` 前缀**的服务端环境变量，Next.js 明确保证这类变量不会被打包进浏览器 bundle |
| 复杂度 | 最简单，一个独立脚本 | 需要一个 API 路由 + 服务端专用 viem 客户端，略增一点结构 |

**结论**：采用**方案 B**。理由：PRD 明确把"受信任提交者"设计成一个后端角色，Next.js Route Handler 是这个仓库里唯一"服务端代码"的落脚点（本项目没有独立后端服务，也不接 Supabase），用它来持有本地测试私钥、代表"后端预言机"发起交易，既不违反"不接入真实数据库/后端服务"的边界（它只是同一个 Next 应用里的服务端路由，不是新服务），又完整还原了 PRD 描述的角色分工；比起方案 A，能让"点确认完成 → 学习中心/个人中心状态更新"这个演示闭环在浏览器里直接跑通。

**关于私钥本身**：使用的是 **Anvil 默认测试账户**的私钥（Anvil 每次启动都会在终端打印这批账户和私钥，是公开、确定性、无真实资产的本地测试值，不是任何人的真实密钥）。该私钥作为服务端环境变量 `TRUSTED_SUBMITTER_PRIVATE_KEY`（**不带 `NEXT_PUBLIC_` 前缀**，Next.js 保证不带该前缀的变量不会出现在客户端 bundle 里）写入 `.env.local`，`.env.example` 里给出占位符并注明"本地 Anvil 默认账户私钥，仅用于本地演示，绝不能填真实私钥"。部署种子脚本（[[14.contract-client-foundation]]）需要把这同一个账户地址注册为 `DemoCompletionOracle` 的受信任提交者（`setTrustedSubmitter`）。

## 模块 1：完课确认 API

`app/api/complete-course/route.ts`（POST）：

```ts
export async function POST(request: Request) {
  const { student, courseId } = await request.json();
  // 校验 student 是合法地址、courseId 是已知的种子课程 ID，拒绝任意输入直接透传上链
  const account = privateKeyToAccount(process.env.TRUSTED_SUBMITTER_PRIVATE_KEY as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: TARGET_CHAIN, transport: http() });
  try {
    const hash = await walletClient.writeContract({
      address: DemoCompletionOracleAddress,
      abi: DemoCompletionOracleAbi,
      functionName: "confirmCompletion",
      args: [student, courseId],
    });
    const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http() });
    await publicClient.waitForTransactionReceipt({ hash });
    return Response.json({ ok: true, hash });
  } catch (error) {
    return Response.json({ ok: false, message: toContractErrorMessage(error) }, { status: 400 });
  }
}
```

- 输入校验：`courseId` 必须在 [[15.onchain-token-course-purchase]] 建立的固定种子课程集合里（拒绝任意数值），`student` 必须是合法以太坊地址格式；这两项校验是为了防止该路由被滥用为"任意 courseId/student 组合"的开放调用入口（虽然本地演示环境风险很低，仍然遵循"不做无意义的开放入口"原则）。
- 这个路由本身不做"是否是当前登录用户在请求自己的完成确认"这类身份校验（本地演示阶段无这个需求，且合约本身已经用 `hasPurchased`/`completed` 状态把关，重复或非法请求会在合约层被拒绝，API 只是转发）。

## 模块 2：前端触发与状态展示

- `components/learning-center/LearningCenter.tsx` 完成全部章节时（`isComplete === true`），"标记完成"按钮下方新增"确认完成并铸造证书"按钮，调用 `lib/purchase/useCompletionConfirmation.ts`：`fetch("/api/complete-course", { method: "POST", body: JSON.stringify({ student: address, courseId }) })`，`TxStatus` 复用 [[14.contract-client-foundation]] 的类型（`signing` 档在这里语义上是"请求发出中"，不是钱包签名——按钮本身文案区分清楚，避免用户误以为需要自己在钱包里签一次）。
- 成功后触发 `Web3University.completed`/`CourseCertificate.hasCertificate` 重新读取（[[15.onchain-token-course-purchase]] 建立的 refetch-after-write 模式的延伸）。
- 已完成课程重复点击：按钮直接禁用（`completed === true` 时不渲染按钮，改为展示"已获得证书"状态），把 API 层面的 `CourseAlreadyCompleted` 当作纵深防御而非首要拦截手段（与 F-005 的"未购买"处理原则一致）。

## 模块 3：NFT 证书展示

`lib/purchase/useOnchainCertificates.ts`：对 [[15.onchain-token-course-purchase]] 建立的固定种子课程集合逐一查询：

```ts
const has = await publicClient.readContract({ functionName: "hasCertificate", args: [courseId, address] });
if (!has) continue;
// 用 hasCertificate 反查 tokenId 有点绕：CourseCertificate 没有 courseId+student -> tokenId 的直接 getter，
// 本地演示环境证书数量少，改为从 CertificateMinted 事件按 courseId/student 过滤查询 tokenId
// （publicClient.getLogs，本地 Anvil 链区块数极少，不构成 PRD 11.3 "不扫描无限范围事件"的顾虑）
const logs = await publicClient.getContractEvents({
  address: CourseCertificateAddress, abi: CourseCertificateAbi, eventName: "CertificateMinted",
  args: { student: address, courseId },
});
const tokenId = logs[0]?.args.tokenId;
const [data, uri, owner] = await Promise.all([
  publicClient.readContract({ functionName: "certificateData", args: [tokenId] }),
  publicClient.readContract({ functionName: "tokenURI", args: [tokenId] }),
  publicClient.readContract({ functionName: "ownerOf", args: [tokenId] }),
]);
```

- `getContractEvents` 查询范围是"本地 Anvil 从创世到现在"的全部区块——本地演示链区块数极少（部署+种子+几笔交易），这里的"全量扫描"和 PRD 11.3 警告的"生产环境无限范围事件扫描"不是同一量级问题，MVP 阶段可接受；如果未来接 Sepolia，这里需要改成按已知部署区块高度做 `fromBlock` 下限，不在本 feature 范围内实现。
- 个人中心"NFT 证书"Tab 展示：tokenId、课程名称（本地按 courseId 映射回 slug 再查 `lib/mock/fixtures.ts` 的课程标题——课程标题本来就是链下数据，不需要从链上 `metadataURI` 反查）、完成时间（`certificateData.completedAt`）、`tokenURI` 原始字符串、拥有者地址（`ownerOf`，用于验证"这枚 NFT 确实在我账户名下"这个真实性展示）。

## 安全考虑

- `TRUSTED_SUBMITTER_PRIVATE_KEY` 是 Anvil 默认测试账户私钥，公开已知、零真实价值，但仍然遵循"服务端环境变量、不带 `NEXT_PUBLIC_` 前缀、`.env.example` 只放占位符"的既有安全约定（保持处理方式一致，即使这次的值本身并不敏感），避免在代码里留下"某些私钥可以硬编码"的坏先例。
- `app/api/complete-course/route.ts` 做最小输入校验（courseId 白名单、地址格式），防止被当作任意调用合约的开放代理，即使当前风险很低。

## 技术决策

| 决策 | 选项 | 理由 |
| --- | --- | --- |
| 受信任提交者私钥位置 | Next.js Route Handler 服务端环境变量（方案 B） | 见上文架构决策对比，与 PRD"后端预言机"角色定位吻合 |
| tokenId 反查方式 | `getContractEvents` 查 `CertificateMinted` | 合约没有 `(courseId, student) → tokenId` 的直接 getter，本地演示环境事件量极小，全量查询可接受 |
| NFT 图片/富媒体展示 | 只展示 `tokenURI` 原始字符串，不渲染图片 | 需求本身不要求（F-003），`tokenURI` 目前内容是课程 metadataURI 字符串而非图片地址 |
