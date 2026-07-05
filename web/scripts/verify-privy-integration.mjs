import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  app: await readFile(new URL("../src/components/blind-procure-app.tsx", import.meta.url), "utf8"),
  account: await readFile(new URL("../src/lib/privy-account.ts", import.meta.url), "utf8"),
  providers: await readFile(new URL("../src/components/providers.tsx", import.meta.url), "utf8"),
  wagmi: await readFile(new URL("../src/lib/wagmi.ts", import.meta.url), "utf8"),
  zama: await readFile(new URL("../src/lib/zama.ts", import.meta.url), "utf8"),
};

const allSource = Object.values(files).join("\n");
const forbiddenPatterns = [
  ["external wallet connector", /\binjected\s*\(/],
  ["Wagmi account hook", /\buseAccount\b/],
  ["Wagmi connect hook", /\buseConnect\b/],
  ["direct Wagmi contract write", /\buseWriteContract\b|walletClient\.writeContract/],
  ["legacy direct user decryption", /\.userDecrypt\s*\(/],
];

for (const [label, pattern] of forbiddenPatterns) {
  assert.doesNotMatch(allSource, pattern, `${label} must not exist in the browser app`);
}

assert.match(files.providers, /loginMethods:\s*\["email",\s*"google"\]/, "Only email and Google login must be configured");
assert.match(files.providers, /NEXT_PUBLIC_PRIVY_APP_ID/, "Privy App ID must be configured from environment");
assert.match(files.providers, /NEXT_PUBLIC_PRIVY_CLIENT_ID/, "Privy Client ID must remain configurable from environment");
assert.match(files.providers, /NEXT_PUBLIC_PRIVY_USE_APP_CLIENT/, "Privy app client usage must be explicitly gated");
assert.match(files.providers, /clientId=\{clientId \|\| undefined\}/, "PrivyProvider must omit app client ID unless enabled");
assert.match(files.providers, /showWalletUIs:\s*false/, "Privy wallet UI must stay hidden");
assert.match(files.account, /smartClient\.sendTransaction\s*\(/, "Writes must use the Privy smart account client");
assert.match(files.account, /calls:\s*\[\{\s*to,\s*data,\s*value:\s*0n\s*\}\]/, "Smart-account writes must use calls");
assert.match(files.app, /account:\s*address,[\s\S]*?price,[\s\S]*?getChainId/, "Bid encryption must bind to the smart-account address");
assert.match(files.zama, /userAddress:\s*account/, "Zama encryption must use the supplied smart-account identity");
assert.match(files.app, /delegatorAddress:\s*address,[\s\S]*?delegateAddress:\s*embeddedWalletAddress/, "Private decryption must delegate from smart account to embedded signer");
assert.match(files.zama, /createDelegatedUserDecryptEIP712/, "Delegated decryption must use Zama's delegated EIP-712 request");
assert.match(files.zama, /client\.delegatedUserDecrypt\s*\(/, "Winning-price decryption must use delegatedUserDecrypt");
assert.match(files.wagmi, /createConfig\s*\(\{[\s\S]*?transports:/, "Wagmi must remain a public-read transport");
assert.doesNotMatch(files.wagmi, /connectors\s*:/, "Wagmi must not configure wallet connectors");

console.log("Privy integration invariants passed:");
console.log("- email and Google are the only login methods");
console.log("- Privy app client ID is configurable but gated until app-client origins are verified");
console.log("- browser writes use the Privy smart account client");
console.log("- bid encryption is bound to the smart account");
console.log("- the embedded EOA is used only as the delegated decryption signer");
console.log("- no external wallet connector or direct browser write path exists");
