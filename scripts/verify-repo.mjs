import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const gitDirs = run("find", [".", "-maxdepth", "5", "-name", ".git", "-type", "d"])
  .split("\n")
  .filter(Boolean)
  .sort();

if (gitDirs.length !== 1 || gitDirs[0] !== "./.git") {
  fail(`Expected exactly one git repo at ./.git, found: ${gitDirs.join(", ") || "none"}`);
}

const trackedFiles = run("git", ["ls-files"]).split("\n").filter(Boolean);
const forbiddenTrackedPatterns = [
  /^\.env($|\.(?!example$))/,
  /^web\/\.env($|\.(?!example$))/,
  /^contracts\/\.env($|\.(?!example$))/,
  /(^|\/)\.vercel\//,
  /(^|\/)node_modules\//,
  /^contracts\/artifacts\//,
  /^contracts\/cache\//,
  /^contracts\/types\//,
  /^contracts\/deployments\//,
  /^web\/\.next\//,
];

const forbiddenTracked = trackedFiles.filter((file) =>
  forbiddenTrackedPatterns.some((pattern) => pattern.test(file)),
);

if (forbiddenTracked.length > 0) {
  fail(`Forbidden generated/secret-like files are tracked:\n${forbiddenTracked.join("\n")}`);
}

if (process.exitCode) process.exit(process.exitCode);

console.log("Repository verification passed.");
console.log("Single git repository: ./.git");
console.log("No tracked env, Vercel, node_modules, build, or contract artifact files.");
