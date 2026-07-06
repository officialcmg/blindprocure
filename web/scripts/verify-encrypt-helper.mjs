import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:3000";
const chromeBin =
  process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = Number(process.env.CHROME_DEBUG_PORT || 9355);
const contractAddress =
  process.env.NEXT_PUBLIC_BLINDPROCURE_ADDRESS || "0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5";
const account = process.env.DEMO_ENCRYPT_ACCOUNT || "0xE8CEa07070fba6eB3660015ddda19ED5127de87A";

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
  return new Promise((resolve, reject) => {
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve: innerResolve, reject: innerReject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        innerReject(new Error(message.error.message));
      } else {
        innerResolve(message.result);
      }
    });
    ws.addEventListener("open", () => {
      resolve({
        send(method, params = {}) {
          const requestId = ++id;
          ws.send(JSON.stringify({ id: requestId, method, params }));
          return new Promise((innerResolve, innerReject) => {
            pending.set(requestId, { resolve: innerResolve, reject: innerReject });
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

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => child.once("exit", resolve));
}

const profileDir = await mkdtemp(join(tmpdir(), "blindprocure-encrypt-chrome-"));
const chrome = spawn(chromeBin, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "about:blank",
]);

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
  await cdp.send("Page.navigate", { url: `${baseUrl}/` });
  await delay(1_500);

  await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    userGesture: true,
    expression: `(() => {
      window.__blindProcureEncryptResult = undefined;
      window.__blindProcureEncryptError = undefined;
      const channelName = "blindprocure-verify-" + crypto.randomUUID();
      const channel = new BroadcastChannel(channelName);
      const timeout = setTimeout(() => {
        channel.close();
        window.__blindProcureEncryptError = "Encryption helper timed out.";
      }, 180000);
      channel.onmessage = (event) => {
        const message = event.data;
        if (message?.type === "ready") {
          channel.postMessage({
            type: "encrypt",
            contractAddress: "${contractAddress}",
            account: "${account}",
            price: "980"
          });
          return;
        }
        clearTimeout(timeout);
        channel.close();
        if (message?.type === "error") {
          window.__blindProcureEncryptError = message.message || "Encryption helper returned an error.";
          return;
        }
        window.__blindProcureEncryptResult = JSON.stringify(message, (_key, currentValue) => {
          if (currentValue instanceof Uint8Array) {
            return {
              typedArray: "Uint8Array",
              length: currentValue.length,
              prefix: Array.from(currentValue.slice(0, 8)),
            };
          }
          return currentValue;
        });
      };
      const helper = window.open("/encrypt-bid?channel=" + encodeURIComponent(channelName), "_blank", "popup,width=480,height=360");
      if (!helper) {
        clearTimeout(timeout);
        channel.close();
        window.__blindProcureEncryptError = "Chrome blocked the encryption helper popup.";
      }
      return "started";
    })()`,
  });

  let rawValue;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    await delay(1_000);
    const poll = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression:
        "window.__blindProcureEncryptError ? JSON.stringify({ error: window.__blindProcureEncryptError }) : window.__blindProcureEncryptResult || null",
    });
    rawValue = poll.result.value;
    if (rawValue) break;
  }

  if (!rawValue) {
    throw new Error("Encryption helper did not return a result before timeout.");
  }

  const value = JSON.parse(rawValue);
  if (value.error) {
    throw new Error(value.error);
  }
  if (value?.type !== "result" || !value.encryptedValues?.[0] || !value.inputProof) {
    throw new Error(`Unexpected encryption helper result: ${JSON.stringify(value)}`);
  }

  console.log("Chrome encryption helper verification passed.");
  console.log(`Encrypted value prefix: ${value.encryptedValues[0].slice(0, 18)}...`);
  console.log(`Input proof prefix: ${value.inputProof.slice(0, 18)}...`);
  cdp.close();
} finally {
  chrome.kill();
  await waitForExit(chrome);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
