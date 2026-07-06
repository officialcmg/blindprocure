import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.DEMO_BASE_URL || "https://blindprocure.vercel.app";
const chromeBin =
  process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.CHROME_DEBUG_PORT || 9333);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) {
    throw new Error(`Chrome CDP request failed: ${path} ${response.status}`);
  }
  return response.json();
}

async function waitForChrome() {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    try {
      await getJson("/json/version");
      return;
    } catch {
      await delay(150);
    }
  }
  throw new Error("Chrome did not expose the debugging endpoint in time.");
}

function connect(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const waiters = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    for (const waiter of [...waiters]) {
      if (waiter.method === message.method) {
        waiter.resolve(message);
        waiters.splice(waiters.indexOf(waiter), 1);
      }
    }
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const requestId = ++id;
          ws.send(JSON.stringify({ id: requestId, method, params }));
          return new Promise((innerResolve, innerReject) => {
            pending.set(requestId, { resolve: innerResolve, reject: innerReject });
          });
        },
        waitFor(method, timeoutMs = 10_000) {
          return new Promise((innerResolve, innerReject) => {
            const waiter = { method, resolve: innerResolve };
            waiters.push(waiter);
            setTimeout(() => {
              const index = waiters.indexOf(waiter);
              if (index !== -1) {
                waiters.splice(index, 1);
                innerReject(new Error(`Timed out waiting for ${method}`));
              }
            }, timeoutMs);
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener("error", reject);
  });
}

function assertIncludesText(text, expected, path) {
  if (!text.toLowerCase().includes(expected.toLowerCase())) {
    throw new Error(`Expected rendered ${path} to include "${expected}". Saw: ${text.slice(0, 500)}`);
  }
}

function assertExcludes(text, unexpected, path) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected rendered ${path} not to include "${unexpected}"`);
  }
}

async function renderedText(cdp, path) {
  const load = cdp.waitFor("Page.loadEventFired", 15_000).catch(() => undefined);
  await cdp.send("Page.navigate", { url: `${baseUrl}${path}` });
  await load;
  await delay(1_000);
  const result = await cdp.send("Runtime.evaluate", {
    expression: "document.body.innerText",
    returnByValue: true,
  });
  return result.result.value || "";
}

const profileDir = await mkdtemp(join(tmpdir(), "blindprocure-chrome-"));
const chrome = spawn(chromeBin, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "about:blank",
]);

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

try {
  await waitForChrome();
  const pages = await getJson("/json/list");
  const page = pages.find((target) => target.type === "page");
  if (!page) {
    throw new Error("Chrome did not create a page target.");
  }

  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const home = await renderedText(cdp, "/");
  assertIncludesText(home, "BlindProcure", "/");
  assertIncludesText(home, "Procurement without public bid leakage", "/");
  assertIncludesText(home, "Launch workspace", "/");
  assertExcludes(home, "Contract address is not configured", "/");

  const app = await renderedText(cdp, "/app");
  assertIncludesText(app, "BlindProcure", "/app");
  assertIncludesText(app, "Tenders", "/app");
  assertIncludesText(app, "Sign in", "/app");
  assertExcludes(app, "Contract address is not configured", "/app");

  const create = await renderedText(cdp, "/app/tenders/new");
  assertIncludesText(create, "Create tender", "/app/tenders/new");
  assertExcludes(create, "Contract address is not configured", "/app/tenders/new");

  const tenders = await renderedText(cdp, "/app/tenders");
  assertIncludesText(tenders, "Tenders", "/app/tenders");
  assertExcludes(tenders, "Contract address is not configured", "/app/tenders");

  const encrypt = await renderedText(cdp, "/encrypt-bid");
  assertIncludesText(encrypt, "Local bid encryption", "/encrypt-bid");
  assertIncludesText(encrypt, "plaintext price never leaves this browser", "/encrypt-bid");
  const isolation = await cdp.send("Runtime.evaluate", {
    expression: "({ isolated: window.crossOriginIsolated, hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined' })",
    returnByValue: true,
  });
  if (!isolation.result.value?.isolated || !isolation.result.value?.hasSharedArrayBuffer) {
    throw new Error(`/encrypt-bid is not Chrome encryption-ready: ${JSON.stringify(isolation.result.value)}`);
  }

  cdp.close();
  console.log("Hosted browser verification passed.");
  console.log(`Base URL: ${baseUrl}`);
} finally {
  chrome.kill();
  await waitForExit(chrome);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
