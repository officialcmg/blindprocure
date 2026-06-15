import { existsSync, writeFileSync } from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const outputPath = new URL("../.env.demo-wallets", import.meta.url);

if (existsSync(outputPath)) {
  throw new Error("web/.env.demo-wallets already exists. Move or delete it before generating new demo wallets.");
}

const roles = [
  ["SUPPLIER_A_PRIVATE_KEY", "Supplier A"],
  ["SUPPLIER_B_PRIVATE_KEY", "Supplier B"],
  ["SUPPLIER_C_PRIVATE_KEY", "Supplier C"],
  ["AUDITOR_PRIVATE_KEY", "Auditor"],
];

const lines = [
  "# Local demo wallets generated for BlindProcure.",
  "# This file is ignored by git. Do not commit private keys.",
  "",
];

console.log("Generated demo wallet addresses:");

for (const [envName, label] of roles) {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  lines.push(`${envName}=${privateKey}`);
  console.log(`${label}: ${account.address}`);
}

writeFileSync(outputPath, `${lines.join("\n")}\n`, { mode: 0o600 });
console.log("");
console.log("Wrote private keys to web/.env.demo-wallets");
console.log("Load it together with your buyer key before running npm run seed:demo --workspace web.");
