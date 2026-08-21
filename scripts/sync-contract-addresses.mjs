#!/usr/bin/env node
// 解析 `contracts/web3-university/broadcast/DeployAllLocal.s.sol/31337/run-latest.json`
// 里各 CREATE 交易的 contractName/contractAddress，写回 `lib/contracts/addresses.ts`
// 对应 chainId 的字段。详见 specs/14.contract-client-foundation/design.md 模块 3。

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const CHAIN_ID = 31337;
const broadcastPath = path.join(
  repoRoot,
  "contracts/web3-university/broadcast/DeployAllLocal.s.sol",
  String(CHAIN_ID),
  "run-latest.json"
);
const addressesOutPath = path.join(repoRoot, "lib/contracts/addresses.ts");

const CONTRACTS = [
  "YDToken",
  "YDFaucet",
  "Web3University",
  "CourseCertificate",
  "DemoCompletionOracle",
];

function main() {
  if (!existsSync(broadcastPath)) {
    console.error(
      `找不到 ${broadcastPath}。请先在 contracts/web3-university/ 目录下针对本地 Anvil 运行 ` +
        `\`forge script script/DeployAllLocal.s.sol --broadcast --rpc-url http://127.0.0.1:8545\`。`
    );
    process.exit(1);
  }

  const broadcast = JSON.parse(readFileSync(broadcastPath, "utf-8"));
  const transactions = Array.isArray(broadcast.transactions) ? broadcast.transactions : [];

  /** @type {Record<string, string>} */
  const addressByContract = {};
  for (const tx of transactions) {
    if (tx.transactionType !== "CREATE") continue;
    if (!CONTRACTS.includes(tx.contractName)) continue;
    addressByContract[tx.contractName] = tx.contractAddress;
  }

  const missing = CONTRACTS.filter((name) => !addressByContract[name]);
  if (missing.length > 0) {
    console.error(
      `广播产物中缺少以下合约的 CREATE 交易：${missing.join(", ")}。请确认部署脚本已成功执行。`
    );
    process.exit(1);
  }

  const entriesTs = CONTRACTS.map(
    (name) => `    "${name}": "${addressByContract[name]}",`
  ).join("\n");

  const tsContent =
    `// 本文件由 \`npm run contracts:sync-addresses\`（scripts/sync-contract-addresses.mjs）\n` +
    `// 自动生成，请勿手工编辑。源数据来自\n` +
    `// contracts/web3-university/broadcast/DeployAllLocal.s.sol/${CHAIN_ID}/run-latest.json。\n\n` +
    `export interface ContractAddresses {\n` +
    `  YDToken: \`0x\${string}\`;\n` +
    `  YDFaucet: \`0x\${string}\`;\n` +
    `  Web3University: \`0x\${string}\`;\n` +
    `  CourseCertificate: \`0x\${string}\`;\n` +
    `  DemoCompletionOracle: \`0x\${string}\`;\n` +
    `}\n\n` +
    `export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {\n` +
    `  ${CHAIN_ID}: {\n${entriesTs}\n  },\n` +
    `};\n`;

  writeFileSync(addressesOutPath, tsContent);
  console.log(`已写入 ${path.relative(repoRoot, addressesOutPath)}：`);
  for (const name of CONTRACTS) {
    console.log(`  ${name}: ${addressByContract[name]}`);
  }
}

main();
