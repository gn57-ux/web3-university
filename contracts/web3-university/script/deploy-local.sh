#!/usr/bin/env bash
# 唯一推荐的本地部署入口：--rpc-url 硬编码为 127.0.0.1，不接受调用方传入其他地址。
#
# `block.chainid == 31337` 校验（见 DeployAllLocal.s.sol）无法防止一个恶意/配置错误
# 的远程节点谎报自己是链 31337——这个信号完全由被连接的节点自己上报，合约拿不到
# "RPC URL 到底是谁"这个信息。真正的边界必须在链下、发起 `forge script` 调用的这一层
# 做：本脚本就是这层控制，只允许连接本机 127.0.0.1，不从任何环境变量、命令行参数
# 读取可覆盖的 RPC 地址（Codex Review 抓到的 P2，见
# specs/14.contract-client-foundation/design.md「安全考虑」）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/.."
REPO_ROOT="$CONTRACTS_DIR/../.."
RPC_URL="http://127.0.0.1:8545"

# 前置校验：Privy 登录时动态创建的学生嵌入式钱包默认零 ETH 余额，前端写交易统一
# 强制传 maxFeePerGas: 0/maxPriorityFeePerGas: 0（见 useContractClients.ts 的
# withZeroFeeDefaults）。检查任何单一配置值（eth_gasPrice、baseFeePerGas 等）都只是
# 代理指标——节点是否真的接受一笔显式零费用交易，取决于 --gas-price/
# --block-base-fee-per-gas/--disable-min-priority-fee 三个启动参数的组合效果，任何
# 一处遗漏都可能在"代理指标看起来正常"的情况下仍然拒绝零费用交易（Codex Review 连续
# 两轮结构化复核抓到的问题：先是只查 eth_gasPrice 不够，再是只查 baseFeePerGas 也不够
# ——根源都是"检查配置的代理值"而非"直接验证行为本身"）。这里改为直接发一笔真实的
# 显式零费用交易做端到端探测：用 Anvil 自带、已预充值的账户 0 给自己转 0 ETH，
# maxFeePerGas/maxPriorityFeePerGas 都显式传 0，交易被节点接受（无论后续区块是否已
# 确认，只要发送本身不被 RPC 拒绝）就说明零费用交易路径真实可用；被拒绝则直接报错，
# 不再依赖任何单一配置值的推断。
ANVIL_ACCOUNT_0="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
if ! cast send "${ANVIL_ACCOUNT_0}" \
  --from "${ANVIL_ACCOUNT_0}" \
  --unlocked \
  --value 0 \
  --gas-price 0 \
  --priority-gas-price 0 \
  --rpc-url "${RPC_URL}" > /dev/null 2>&1; then
  echo "错误：本地 Anvil（${RPC_URL}）拒绝了一笔显式零费用（maxFeePerGas=0，" >&2
  echo "maxPriorityFeePerGas=0）的探测交易。前端写交易统一强制零费用，要求节点" >&2
  echo "必须接受这类交易，否则零 ETH 的 Privy 钱包发出的每笔交易都会失败。" >&2
  echo "请用以下参数重启 Anvil：" >&2
  echo "  anvil --host 127.0.0.1 --port 8545 --gas-price 0 --block-base-fee-per-gas 0 --disable-min-priority-fee" >&2
  exit 1
fi

cd "$CONTRACTS_DIR"
forge script script/DeployAllLocal.s.sol --broadcast --rpc-url "${RPC_URL}"

# 后置动作：CREATE 地址由部署者 nonce 决定，若这不是对一条全新 Anvil 链的首次部署
# （比如之前已经在同一条链上发过其他交易），重新部署会产生和 lib/contracts/addresses.ts
# 里不同的新地址。不强制要求"必须是全新链"这个前置条件（会让脚本变得脆弱、依赖操作者
# 记忆），而是每次部署成功后都无条件重新同步地址产物，保证前端引用的地址永远和刚刚
# 实际部署的结果一致，不会出现"用旧地址悄悄连接到不存在/错误合约"的情况（Codex Review
# 抓到的 P2）。
echo ""
echo "部署完成，正在同步合约地址到前端 lib/contracts/addresses.ts ..."
(cd "$REPO_ROOT" && npm run contracts:sync-addresses)
