import { createPublicClient, createWalletClient, getAddress, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { LOCAL_ANVIL_CHAIN_ID, TARGET_CHAIN } from "@/lib/contracts/chain";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { DemoCompletionOracleAbi } from "@/lib/contracts/abis/DemoCompletionOracle";
import { Web3UniversityAbi } from "@/lib/contracts/abis/Web3University";
import { toContractErrorMessage } from "@/lib/contracts/txError";
import { COURSE_ID_MAP } from "@/lib/contracts/courseIdMap";

// `confirmCompletion` 内部转发调用 `Web3University.markCompleted`（见
// DemoCompletionOracle.sol），真正的业务 revert（CourseNotPurchased/
// CourseAlreadyCompleted/CourseNotFound）来自被转发到的那个合约，其自定义
// error 选择器只在 Web3UniversityAbi 里声明——只用 DemoCompletionOracleAbi 做
// simulateContract，viem 拿不到匹配的 ABI 条目解码出 errorName，会退化成
// toContractErrorMessage 里的通用"合约拒绝了本次操作"兜底文案，用户看不到具体
// 原因（已用真实重复确认场景验证：不合并 ABI 时确实拿到的是通用兜底文案，
// 不是 CourseAlreadyCompleted 对应的中文提示）。合并两份 ABI 让 viem 能匹配到
// 完整的自定义 error 集合，不影响 `confirmCompletion` 本身的函数签名解析。
const SIMULATE_ABI = [...DemoCompletionOracleAbi, ...Web3UniversityAbi] as const;

// 与 useContractClients.ts 的 withZeroFeeDefaults 同一个根因、同一个修复，只是
// 这里发生在服务端：Anvil 即使以 --gas-price 0 --block-base-fee-per-gas 0
// --disable-min-priority-fee 启动，`eth_maxPriorityFeePerGas` 仍会建议 1 gwei，
// 但区块 baseFee 是 0——viem 的 writeContract 自动估费在这个组合下算出的
// maxFeePerGas 可能低于 maxPriorityFeePerGas，导致"tip 高于 fee cap"报错（已用
// 真实 confirmCompletion 调用验证，即使受信任提交者账户本身有充足 ETH 余额，
// 与 Privy 零余额钱包的零费用需求是两个独立诱因，但触发的是同一个 viem 估费
// bug，修复方式相同）。只在 TARGET_CHAIN.id === LOCAL_ANVIL_CHAIN_ID 时套用，
// 换成 Sepolia 后自动退回正常估费。
const ZERO_FEE_OVERRIDES =
  TARGET_CHAIN.id === LOCAL_ANVIL_CHAIN_ID
    ? ({ maxFeePerGas: 0n, maxPriorityFeePerGas: 0n } as const)
    : {};

// 受信任提交者角色（design.md「架构决策」方案 B）：这个 Route Handler 是本仓库
// 唯一持有 TRUSTED_SUBMITTER_PRIVATE_KEY 的地方，代表 PRD 描述的"受信任后端/
// 预言机"发起 DemoCompletionOracle.confirmCompletion 调用。这个私钥即使是公开
// 已知、零价值的 Anvil 默认测试账户私钥（见 DeployAllLocal.s.sol 的账户角色分配
// 注释），也只通过不带 NEXT_PUBLIC_ 前缀的服务端环境变量读取，绝不硬编码在这里
// 或任何会被打包进浏览器 bundle 的位置——保持"私钥只走服务端环境变量"这一处理
// 方式的一致性，不因为这次的值本身不敏感就破例。
const ALLOWED_COURSE_IDS = new Set(Object.values(COURSE_ID_MAP).map((id) => id.toString()));

interface CompleteCourseRequestBody {
  student?: unknown;
  courseId?: unknown;
}

export async function POST(request: Request) {
  const submitterKey = process.env.TRUSTED_SUBMITTER_PRIVATE_KEY;
  if (!submitterKey) {
    // 缺少环境变量必须明确报错，不能静默用假值或跳过校验——真实交易层没有
    // "假值兜底"这个选项（与 useWallet.tsx 缺少 NEXT_PUBLIC_PRIVY_APP_ID 时的
    // 处理原则一致）。
    return Response.json(
      { ok: false, message: "服务端未配置 TRUSTED_SUBMITTER_PRIVATE_KEY，请检查 .env.local" },
      { status: 500 }
    );
  }

  let body: CompleteCourseRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "请求体不是合法 JSON" }, { status: 400 });
  }

  const { student, courseId } = body;

  // 输入校验：courseId 必须在已知种子课程集合里，student 必须是合法地址格式——
  // 拒绝任意输入直接透传上链，防止这个路由被当成"任意 courseId/student 组合"的
  // 开放调用入口（design.md 模块 1）。
  if (typeof student !== "string" || !isAddress(student)) {
    return Response.json({ ok: false, message: "student 不是合法的以太坊地址" }, { status: 400 });
  }
  if (
    (typeof courseId !== "string" && typeof courseId !== "number") ||
    !ALLOWED_COURSE_IDS.has(String(courseId))
  ) {
    return Response.json({ ok: false, message: "courseId 不在已知课程范围内" }, { status: 400 });
  }

  const account = privateKeyToAccount(submitterKey as `0x${string}`);
  const walletClient = createWalletClient({ account, chain: TARGET_CHAIN, transport: http() });
  const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http() });
  const addresses = CONTRACT_ADDRESSES[TARGET_CHAIN.id];
  const studentAddress = getAddress(student);
  const onchainCourseId = BigInt(courseId);

  try {
    // 与 15/16 前端写操作 Hook 同一套标准顺序（见 txError.ts 顶部注释）：
    // simulateContract() 先行，才能在 CourseNotPurchased/CourseAlreadyCompleted
    // 等自定义 revert 时拿到可解码的 errorName，不是直接裸调 writeContract。
    const { request: simulatedRequest } = await publicClient.simulateContract({
      account,
      address: addresses.DemoCompletionOracle,
      abi: SIMULATE_ABI,
      functionName: "confirmCompletion",
      args: [studentAddress, onchainCourseId],
    });
    // 与 useContractClients.ts 的 withZeroFeeDefaults 同一个已知限制：viem 的
    // writeContract 是多重泛型重载签名，往 simulateContract 返回的 request 上
    // 展开覆盖字段后，TS 无法再把结果收窄回某个具体重载，只能在这一行放宽类型
    // （对外暴露的仍是精确类型，只有这一次调用需要）。
    const hash = await walletClient.writeContract({
      ...simulatedRequest,
      ...ZERO_FEE_OVERRIDES,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      return Response.json({ ok: false, message: "交易未成功确认" }, { status: 400 });
    }
    return Response.json({ ok: true, hash });
  } catch (error) {
    return Response.json({ ok: false, message: toContractErrorMessage(error) }, { status: 400 });
  }
}
