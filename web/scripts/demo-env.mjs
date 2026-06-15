import { existsSync, readFileSync } from "node:fs";

export function loadDemoEnv(extraFiles = []) {
  for (const file of ["../.env.demo-local", "../.env.demo-wallets", "../.env.demo-result", ...extraFiles]) {
    const envPath = new URL(file, import.meta.url);
    if (!existsSync(envPath)) continue;

    const contents = readFileSync(envPath, "utf8");
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  }
}
