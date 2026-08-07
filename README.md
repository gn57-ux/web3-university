# 周六作业：Solidity 合约

本目录包含两个可直接复制到 Remix 的合约：

- `contracts/PrivateBank.sol`：每个地址充值、查询并提取自己的 ETH。
- `contracts/EthRedPacket.sol`：创建等额或教学用伪随机 ETH 红包，每个地址限领一次。

## 1. 私人银行演示

1. 打开 <https://remix.ethereum.org/>，新建 `PrivateBank.sol` 并粘贴合约。
2. 在 **Solidity Compiler** 中选择 `0.8.24` 或兼容的 `0.8.x`，点击 Compile。
3. 在 **Deploy & Run Transactions** 中选择 `Remix VM`，点击 Deploy。
4. 在 VALUE 输入 `1`，单位选 `ether`，点击橙色的 `deposit`。
5. 点击 `myBalance`，应返回 `1000000000000000000` wei。
6. 调用 `withdraw`，参数填 `500000000000000000`，再查余额应剩 `0.5 ETH`。
7. 切换另一个 Account，`myBalance` 应为 0，且不能提取第一个账户的钱。

## 2. ETH 抢红包演示

部署构造参数示例：

- `count`：`3`
- `equalMode`：`true`（等额）或 `false`（伪随机）
- `durationSeconds`：`300`（5 分钟）
- Remix 的 VALUE：`3 ether`

部署后：

1. 切换到另一个 Remix Account，调用 `grabRedPacket`。
2. 调用 `hasClaimed` 并输入刚才的地址，应返回 `true`。
3. 同一账户再次调用 `grabRedPacket`，交易应回滚并提示已经领取。
4. 切换不同账户继续抢，观察 `remainingAmount` 和 `remainingCount`。
5. 过期后，只有创建者能调用 `refund` 取回未领取的 ETH。

## 答辩时可讲的要点

- `payable` 让函数或构造器能够接收 ETH；`msg.value` 是本次发送的金额。
- `mapping` 保存账户余额或领取状态。
- 提现采用 Checks-Effects-Interactions：先检查、再更新状态、最后转账。
- `nonReentrant` 防止收款合约在转账回调中重复进入提现或领取函数。
- 链上数据不是秘密；`block.prevrandao` 等区块数据也不是安全随机源。本作业随机红包只适合课堂演示，真实资金应使用可验证随机数方案。

> 建议先在 Remix VM 演示，不花测试币。周六作业本身不需要 Vite、React、wagmi 或 Hardhat；这些留到周日 DApp。
