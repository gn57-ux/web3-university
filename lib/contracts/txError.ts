// 统一链上交易状态与错误文案。见 specs/14.contract-client-foundation/design.md 模块 6。
//
// 重要使用约定（15/16 实现具体业务 Hook 时必须遵守）：本模块的自定义合约 error
// 解码（CONTRACT_ERROR_MESSAGES）依赖 viem 的 `simulateContract` 在预检失败时
// 同步抛出、带 `data.errorName` 的 `ContractFunctionRevertedError`。直接调用
// `walletClient.writeContract(...)` 而不先 `publicClient.simulateContract(...)`
// 不会得到这个效果——`writeContract` 只在 RPC 层面的估费/估 gas/签名失败时才
// reject，链上真正 revert 时它仍然正常返回交易哈希，revert 要等
// `waitForTransactionReceipt()` 读到 `status === "reverted"` 才能感知，且那条
// 路径里没有解码出来的 errorName 可用（已用真实 `AlreadyClaimed` 场景验证两种
// 路径的差异）。因此写操作 Hook 的标准调用顺序应为：
// `simulateContract()` → 用其 `request` 调用 `writeContract()` →
// `waitForTransactionReceipt()`；`simulateContract` 阶段的失败交给
// `toContractErrorMessage` 处理，能拿到具体业务错误提示；
// `waitForTransactionReceipt` 阶段如果仍然 `status === "reverted"`（罕见，一般是
// 状态在模拟和上链之间发生了变化），退化为通用兜底提示即可，不强求也能精确解码。
export type TxStatus = "idle" | "signing" | "pending" | "success" | "error";

interface ViemErrorLike {
  name?: string;
  shortMessage?: string;
  message?: string;
  cause?: unknown;
  data?: { errorName?: string } | undefined;
}

const FALLBACK_MESSAGE = "链上操作失败，请重试。";
const CONTRACT_REJECTED_FALLBACK = "合约拒绝了本次操作";

function isViemErrorLike(error: unknown): error is ViemErrorLike {
  return typeof error === "object" && error !== null;
}

// 递归查找错误链（viem 的错误经常层层包裹在 .cause 里）中第一个匹配 name 的节点。
function findErrorByName(error: unknown, name: string, depth = 0): ViemErrorLike | null {
  if (depth > 10 || !isViemErrorLike(error)) return null;
  if (error.name === name) return error;
  return findErrorByName(error.cause, name, depth + 1);
}

// 常见 viem 错误名 → 中文提示（与"哪个合约、哪个业务"无关的通用失败类别）。
// 不含 ContractFunctionRevertedError——那类错误必须在 toContractErrorMessage 里
// 优先判断（且顺序在这张表的匹配循环之前，见函数实现的说明），不能被
// TransactionExecutionError 这类更外层的通用错误名抢先匹配掉。
const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  UserRejectedRequestError: "已取消签名",
  InsufficientFundsError: "账户余额不足以支付本次交易",
  HttpRequestError: "网络请求失败，请检查连接后重试",
  RpcRequestError: "RPC 请求失败，请稍后重试",
  TimeoutError: "请求超时，请稍后重试",
  TransactionExecutionError: "交易执行失败，请重试",
};

// 已实现的 5 个合约（见 contracts/web3-university/src/）目前定义的全部自定义
// error 名称 → 中文提示。跨合约共用的错误名（ZeroAddress/NotOwner）只在部署/
// 管理场景才会触发，用同一句提示即可；同名但业务含义不同的错误（如没有）需要
// 拆开处理，目前没有这种情况。
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  ZeroAddress: "配置了无效的零地址，请联系管理员",
  NotOwner: "仅管理员可执行此操作",
  AlreadyClaimed: "该地址已领取过，每个地址仅可领取一次",
  InsufficientFaucetBalance: "水龙头余额不足，请联系管理员补充",
  NotWhitelistedTeacher: "仅白名单老师可执行此操作",
  InvalidPrice: "课程价格无效",
  CourseNotFound: "课程不存在",
  CourseAlreadyApproved: "课程已审核通过，无需重复审核",
  NotCourseTeacher: "仅该课程的老师本人可执行此操作",
  CourseNotApproved: "课程尚未通过审核，无法上架",
  CourseNotAvailable: "课程当前不可购买（未审核、未上架或老师已被取消授权）",
  AlreadyPurchased: "你已购买过该课程，无需重复购买",
  NotOracle: "仅授权的完课确认合约可执行此操作",
  CourseNotPurchased: "尚未购买该课程，无法确认完成",
  CourseAlreadyCompleted: "该课程已确认完成，无需重复确认",
  NotMinter: "仅授权的核心合约可铸造证书",
  CertificateAlreadyMinted: "你已获得该课程的证书，无法重复铸造",
  NotTrustedSubmitter: "仅受信任的提交者可执行此操作",
};

export function toContractErrorMessage(error: unknown): string {
  // 合约 revert 必须最先判断：viem 真实抛出的错误链通常是
  // TransactionExecutionError（外层）包着 ContractFunctionExecutionError 再包着
  // ContractFunctionRevertedError（最内层，真正的 revert 原因），如果先跑下面的
  // 通用错误名循环，会在还没检查到 ContractFunctionRevertedError 之前就被外层的
  // TransactionExecutionError 提前匹配走，返回一句宽泛的"交易执行失败"，导致
  // CONTRACT_ERROR_MESSAGES 里已经写好的具体业务映射永远没有机会生效——这正是
  // Codex Review 结构化复核连续抓到的两个问题的根源：先是把
  // ContractFunctionRevertedError 错放进通用表导致自定义错误映射失效，修复后又被
  // 更外层的 TransactionExecutionError 抢先匹配，本质是同一类"检查顺序"错误，
  // 这次直接把合约 revert 的判断提到最前面，不再有任何通用规则能抢在它前面。
  const reverted = findErrorByName(error, "ContractFunctionRevertedError");
  if (reverted) {
    const errorName = reverted.data?.errorName;
    if (errorName && CONTRACT_ERROR_MESSAGES[errorName]) {
      return CONTRACT_ERROR_MESSAGES[errorName];
    }
    return CONTRACT_REJECTED_FALLBACK;
  }

  for (const [name, message] of Object.entries(KNOWN_ERROR_MESSAGES)) {
    if (findErrorByName(error, name)) return message;
  }

  if (isViemErrorLike(error)) {
    if (typeof error.shortMessage === "string" && error.shortMessage.trim() !== "") {
      return error.shortMessage;
    }
    if (typeof error.message === "string" && error.message.trim() !== "") {
      return error.message;
    }
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return FALLBACK_MESSAGE;
}
