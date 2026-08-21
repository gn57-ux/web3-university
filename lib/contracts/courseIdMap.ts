// 固定 slug ↔ 链上 courseId 映射：来自
// `contracts/web3-university/script/DeployAllLocal.s.sol` 的种子课程创建顺序
// （courseId 从 1 开始自增，按 `_seedCourse` 调用顺序依次对应下列三门课程）。
// 已在真实 Anvil 本地链上用
// `cast call <Web3University> "courses(uint256)(address,uint256,string,bool,bool)" <id>`
// 逐一核对 `metadataURI` 字段确实是这三个 slug，不是凭假设硬编码（见
// specs/15.onchain-token-course-purchase/tasks.md T-003）。
//
// MVP 阶段课程数量固定已知（3 门），不引入事件索引器；未来新增课程需要同步更新
// 本表，见 design.md「技术决策」。
export const COURSE_ID_MAP: Record<string, bigint> = {
  "solidity-101": 1n,
  "web3-dapp-from-zero": 2n,
  "defi-uniswap-practical": 3n,
};

/**
 * 把课程 slug 转换成链上 `uint256 courseId`。slug 不在映射表里（理论上不会发生——
 * 应用内所有课程详情/学习中心页面都只会用 `lib/mock/fixtures.ts` 的
 * `mockCourses` 里的 3 个已知 slug 渲染）时抛错，而不是静默返回一个错误的
 * courseId 去读写合约。
 */
export function getOnchainCourseId(slug: string): bigint {
  const courseId = COURSE_ID_MAP[slug];
  if (courseId === undefined) {
    throw new Error(`未知课程 slug："${slug}"，缺少链上 courseId 映射`);
  }
  return courseId;
}

/** 反向映射：链上 courseId → slug，供购买记录展示等场景使用。 */
export function getCourseSlugById(onchainCourseId: bigint): string | null {
  for (const [slug, id] of Object.entries(COURSE_ID_MAP)) {
    if (id === onchainCourseId) return slug;
  }
  return null;
}
