import { readFile } from "node:fs/promises";

const [
  ,
  ,
  contractAddress,
  solcInputPath,
  contractName = "contracts/BlindProcure.sol:BlindProcure",
] = process.argv;

const apiKey = process.env.ETHERSCAN_API_KEY;
const chainId = process.env.ETHERSCAN_CHAIN_ID || "11155111";
const compilerVersion = process.env.SOLC_VERSION || "v0.8.27+commit.40a35a09";
const endpoint = "https://api.etherscan.io/v2/api";

if (!apiKey) {
  throw new Error("ETHERSCAN_API_KEY is required.");
}
if (!contractAddress || !solcInputPath) {
  throw new Error("Usage: node scripts/verify-etherscan-standard-json.mjs <address> <solc-input-json> [contractName]");
}

async function post(params) {
  const { chainid, ...bodyParams } = params;
  const response = await fetch(`${endpoint}?${new URLSearchParams({ chainid })}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(bodyParams),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Etherscan returned non-JSON response: ${text.slice(0, 300)}`);
  }
  return json;
}

async function check(guid) {
  const response = await fetch(
    `${endpoint}?${new URLSearchParams({
      chainid: chainId,
      module: "contract",
      action: "checkverifystatus",
      guid,
      apikey: apiKey,
    })}`,
  );
  return response.json();
}

const sourceCode = await readFile(solcInputPath, "utf8");

const submission = await post({
  chainid: chainId,
  module: "contract",
  action: "verifysourcecode",
  contractaddress: contractAddress,
  sourceCode,
  codeformat: "solidity-standard-json-input",
  contractname: contractName,
  compilerversion: compilerVersion,
  optimizationUsed: "1",
  runs: "800",
  apikey: apiKey,
});

if (submission.status !== "1") {
  const result = String(submission.result || "");
  if (/already verified/i.test(result)) {
    console.log("Contract is already verified.");
    process.exit(0);
  }
  throw new Error(`Etherscan submission failed: ${submission.message} - ${result}`);
}

const guid = submission.result;
console.log(`Submitted verification request ${guid}. Waiting for result...`);

for (let attempt = 1; attempt <= 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  const status = await check(guid);
  const result = String(status.result || "");

  if (status.status === "1") {
    console.log(result);
    process.exit(0);
  }
  if (!/pending in queue/i.test(result)) {
    throw new Error(`Etherscan verification failed: ${status.message} - ${result}`);
  }
  console.log(`Still pending (${attempt}/30)...`);
}

throw new Error("Etherscan verification timed out while pending.");
