---
description: 分支、commit 与 PR 规范
---

# Git 工作流

## Commit 规范

仓库现有历史使用 Conventional Commits 风格（例：`feat: add private bank and ETH red packet contracts`），继续遵循：

- 常用类型：`feat`（新功能）、`fix`（修复）、`docs`（文档）、`style`（样式/格式，非 CSS）、`refactor`、`test`、`chore`。
- 提交信息用祈使句、英文或中文均可，但需简洁说明"做了什么"，不复述 diff 细节。
- 一次 commit 聚焦一个逻辑改动，避免把前端、合约、文档改动混在同一个 commit。

## 分支

- 当前仓库在 `main` 分支直接开发。新增较大功能（如前端项目初始化）时，建议使用 `feat/xxx`、`fix/xxx` 等前缀分支，再合并回 `main`。

## 其他

- 不删除或修改 `contracts/` 下现有合约文件的业务逻辑，除非任务明确要求。
- 涉及 `.claude/` 配置的改动优先增量补充，不整体覆盖已有内容。
