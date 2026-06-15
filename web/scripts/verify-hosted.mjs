const baseUrl = process.env.DEMO_BASE_URL || "https://blindprocure.vercel.app";

async function fetchText(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "user-agent": "BlindProcure demo verifier" },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed with ${response.status}`);
  }
  return response.text();
}

function assertIncludes(text, expected, path) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${path} to include "${expected}"`);
  }
}

function assertExcludes(text, unexpected, path) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected ${path} not to include "${unexpected}"`);
  }
}

const home = await fetchText("/");
assertIncludes(home, "BlindProcure", "/");
assertIncludes(home, "Choose the cheapest compliant supplier", "/");
assertIncludes(home, "Open demo flow", "/");
assertExcludes(home, "Contract address is not configured", "/");

const demo = await fetchText("/demo");
assertIncludes(demo, "Demo tender", "/demo");
assertIncludes(demo, "Open tender #1", "/demo");
assertExcludes(demo, "Contract address is not configured", "/demo");

const missingTender = await fetchText("/tenders/1");
assertIncludes(missingTender, "BlindProcure", "/tenders/1");
assertExcludes(missingTender, "BUDGET CAP", "/tenders/1");
assertExcludes(missingTender, "Ready to finalize", "/tenders/1");

console.log("Hosted deployment verification passed.");
console.log(`Base URL: ${baseUrl}`);
