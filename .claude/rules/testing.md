---
description: 测试约定（前端 Mock 阶段 + 未来合约测试）
---

# 测试规范

项目尚未引入测试框架，以下为初始化后应遵循的约定。

## 前端（当前阶段）

- 当前只做 Stitch 设计稿的 UI 还原与 Mock 交互，暂不强制要求自动化测试覆盖率。
- 优先保证：页面在浏览器中可正常渲染、交互状态（loading/empty/error 等 mock 态）可手动触发验证。
- 若引入组件测试（如 Vitest + Testing Library），测试文件与被测组件同目录，命名为 `*.test.tsx`。
- 不要为 mock 数据层编写端到端测试，等真实钱包/合约/数据库接入后再补充。

## 智能合约（未来，按 PRD 里程碑一）

- 引入 Foundry 后，测试文件放在 `test/`，命名为 `<Contract>.t.sol`。
- 至少覆盖：权限校验、重复操作防护（重复领取/重复购买/重复铸造）、Checks-Effects-Interactions 相关的重入场景。
- 现有 `contracts/PrivateBank.sol`、`contracts/EthRedPacket.sol` 是教学示例，若为其补充测试，不得修改合约本身逻辑。
