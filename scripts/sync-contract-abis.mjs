#!/usr/bin/env node
// 从 `contracts/web3-university/out/` 的 Foundry 编译产物提取 ABI，写入
// `lib/contracts/abis/{Contract}.ts`。前端 `npm run build` 不应依赖本机装有
// Foundry——本脚本只读已提交/已生成的 `out/` 目录，不自动执行 `forge build`。
// 详见 specs/14.contract-client-foundation/design.md 模块 2。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const foundryOutDir = path.join(repoRoot, "contracts/web3-university/out");
const abisOutDir = path.join(repoRoot, "lib/contracts/abis");

const CONTRACTS = [
  "YDToken",
  "YDFaucet",
  "Web3University",
  "CourseCertificate",
  "DemoCompletionOracle",
];

function main() {
  if (!existsSync(foundryOutDir)) {
    console.error(
      `找不到 ${foundryOutDir}。请先在 contracts/web3-university/ 目录下执行 \`forge build\`。`
    );
    process.exit(1);
  }

  for (const contract of CONTRACTS) {
    const artifactPath = path.join(foundryOutDir, `${contract}.sol`, `${contract}.json`);
    if (!existsSync(artifactPath)) {
      console.error(
        `找不到 ${artifactPath}。请先在 contracts/web3-university/ 目录下执行 \`forge build\`。`
      );
      process.exit(1);
    }

    const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
    const abi = artifact.abi;
    if (!Array.isArray(abi)) {
      console.error(`${artifactPath} 缺少 .abi 字段，无法生成。`);
      process.exit(1);
    }

    const tsContent =
      `// 本文件由 \`npm run contracts:sync-abi\`（scripts/sync-contract-abis.mjs）自动生成，\n` +
      `// 请勿手工编辑。源数据来自 contracts/web3-university/out/${contract}.sol/${contract}.json。\n\n` +
      `export const ${contract}Abi = ${JSON.stringify(abi, null, 2)} as const;\n`;

    const outPath = path.join(abisOutDir, `${contract}.ts`);
    writeFileSync(outPath, tsContent);
    console.log(`已写入 ${path.relative(repoRoot, outPath)}（${abi.length} 个 ABI 条目）`);
  }
}

main();
