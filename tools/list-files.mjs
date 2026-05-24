import { spawn } from "node:child_process";

const input = await readInput();
const searchPath = safePath(input.path);
const pattern = typeof input.pattern === "string" && input.pattern.trim().length > 0 ? input.pattern : undefined;
const limit = normalizeLimit(input.limit);

const args = [
  "--files",
  "--hidden",
  "--glob",
  "!node_modules",
  "--glob",
  "!.git",
  "--glob",
  "!runs",
  "--glob",
  "!graphify-out",
  "--glob",
  "!dist"
];

if (pattern) {
  args.push("--glob", pattern);
}

args.push(searchPath ?? ".");

const output = await runRg(args);
writeText(limitLines(output, limit));

async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function safePath(value) {
  if (typeof value !== "string" || value.startsWith("/") || value.includes("..")) return undefined;
  return value;
}

function normalizeLimit(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 200;
  return Math.max(1, Math.min(500, Math.floor(value)));
}

function runRg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("rg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      code === 0 || code === 1 ? resolve(stdout) : reject(new Error(stderr.trim() || "rg failed"));
    });
  });
}

function limitLines(text, lineLimit) {
  return text.split("\n").slice(0, lineLimit).join("\n");
}

function writeText(text) {
  process.stdout.write(JSON.stringify({ text: text || "(no matches)" }));
}
