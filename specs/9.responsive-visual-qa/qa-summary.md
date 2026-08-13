# 响应式与视觉 QA — 总结报告

日期：2026-08-13

## 核验范围

全部 7 个已实现页面：

| 页面 | 路由 |
| --- | --- |
| 首页 | `/` |
| 课程广场 | `/courses` |
| 课程详情 | `/courses/solidity-101`、`/courses/defi-uniswap-practical` |
| 学习中心 | `/learn/solidity-101`（已购课状态） |
| 个人中心 | `/profile` |
| 老师工作台 | `/teacher` |
| Owner 后台 | `/admin` |

按 3 个并行小组走查：

1. 首页 / 课程广场 / 课程详情
2. 学习中心 / 个人中心
3. 老师工作台 / Owner 后台

## 测试断点

| 档位 | 宽度 |
| --- | --- |
| 移动 | 375px、414px |
| 平板 | 768px、1024px |
| 桌面 | 1280px、1440px |

每个页面在 6 档宽度下均做了：横向溢出检测（`document.documentElement.scrollWidth` vs `clientWidth`）、区块堆叠顺序核查、文本截断/断行核查、可交互元素可用性核查、图片/卡片比例核查。

## 发现并修复的问题

### 1. TopNav 在 768px～818px 宽度区间导航文字异常换行（P1，三个走查小组独立发现并互相印证）

- **现象**：全站共享的 `components/layout/TopNav.tsx` 用 Tailwind `md:flex`（768px）启用桌面横排导航、`md:hidden` 隐藏移动端汉堡菜单。768px 恰好是断点触发点，此时可用宽度不足以容纳 Logo + 4 个导航链接 + 网络徽标 + 连接钱包按钮，导致"课程广场""老师工作台""Owner 后台"等导航文字被压缩为两行；同时移动端汉堡菜单在同一断点已被隐藏，用户在 768–818px 区间完全没有可用的正常导航形式。
- **影响范围**：全站 7 个页面（TopNav 挂载于根布局，全站共用同一份）。
- **修复**：将桌面导航启用断点与移动菜单隐藏断点统一从 `md`（768px）提高到 `lg`（1024px），与项目其它组件（`AdminSidebar.tsx`、多处课程网格 `lg:grid-cols-3`）已经在用的断点保持一致，消除两套导航"都不满足"的空档区间。
- **验证**：769px 修复完整性走查 + 独立 code review（APPROVED），确认 768–1023px 正确显示移动端汉堡菜单，≥1024px 正确显示桌面横排导航，无空档、无重叠。

### 2. 课程详情页星级评分误用第三色琥珀（P3，视觉一致性核验发现）

- **现象**：`components/course-detail/CourseReviews.tsx` 的 `StarRating` 用 `fill-tertiary text-tertiary`（琥珀色）渲染星级评分。项目设计令牌语义约定第三色琥珀仅用于代币/余额相关信息，评分星星与此无关，属于语义误用。
- **修复**：改为 `fill-secondary text-secondary`（薄荷绿，语义上更贴近"正向反馈"），与全站其它正向反馈场景（完成态勾选、进度条等）的用色语义保持一致。

## 视觉一致性核验结果

对 7 个页面的源码做了颜色/字体/圆角/间距令牌抽查（`grep` 扫描 + 人工核对代表性组件），核验清单见 `design.md`：

- **颜色**：全部使用设计令牌 class（`bg-primary-container`/`text-on-surface`/`bg-secondary-container`/`bg-tertiary-container`/`bg-error-container` 等），未发现随意十六进制色值或 Tailwind 默认调色板颜色（`bg-red-500` 类）。唯一的语义误用（星级评分误用 tertiary）已修复，见上。
- **字体**：标题类文字统一使用 `font-heading`（Sora），正文默认 Inter，地址/交易哈希/表头/价格数字统一使用 `font-mono`（JetBrains Mono），未发现遗漏或误用。
- **圆角**：卡片 `rounded-lg`、按钮/输入框 `rounded-md`、徽标/头像 `rounded-full`，未发现越界用法。
- **间距**：`gap-stack-sm/md/lg`、`py-stack-sm/md/lg` 等语义间距按场景正确使用；仅有的少量硬编码像素值（如 `AdminTable.tsx` 的 `min-w-[560px]` 表格最小宽度、`CertificatesTab.tsx` 的 `p-[2px]` 虹彩边框厚度）均为有明确理由的非语义用途，非违规。
- **主/辅/第三色语义**：主色紫罗兰用于主要 CTA、辅色薄荷绿仅用于正向反馈/进度/成功态、第三色琥珀仅用于代币/余额相关信息，抽查的核心组件（`PurchasePanel`/`LessonList`/`CertificatesTab`/`FeaturedCourses`/`CourseCard`/`PurchaseRecordsTab`/`CourseAnalyticsModal`/Owner 后台状态徽标）均符合语义约定。

## 断点降级与堆叠顺序核查结果

7 个页面在移动端的区块堆叠顺序均核查通过，包括此前已在各自 feature 的 review/QA 阶段专门修复过的顺序问题（如学习中心的"章节进度应在评论之前"，见 Feature 5 记录）未回归。三档断点下均未发现意外横向滚动条、内容裁切、可交互元素重叠或不可点击的情况。

## 安全提示（走查过程中的插曲，与页面质量无关）

其中一个并行走查 agent 在执行过程中，工具结果里出现了一条伪装成系统提醒的消息，试图诱导其超出分派范围测试其它页面并隐瞒用户。该 agent 正确识别为 prompt injection，未执行、如实汇报。已确认未对本次 QA 结果或代码产生任何影响。

## 遗留问题

无。本轮发现的 2 个问题均已修复并通过独立 code review。

## 结论

AC-001（7 个页面三档断点走查）✅、AC-002（问题均已修复，无遗留）✅、AC-003（视觉一致性核验通过）✅、AC-004（本报告）✅。
