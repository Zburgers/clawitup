import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Writable } from "node:stream";
import type { GCMessage } from "gitclaw";
import type { AuditStageInput, AuditStageOutput } from "./audit-runner.js";

const execFileAsync = promisify(execFile);
const MESSAGE_PREVIEW_LIMIT = 160;

export type RepoMetadata = {
  repoRoot: string;
  branch: string;
  commitSha: string;
};

export type AgentModelSelection = {
  provider: string;
  model: string;
  raw: string;
};

export type AuditRunHeader = RepoMetadata & {
  modelSelection: AgentModelSelection;
  mode: string;
  scope: string[];
  task?: string;
};

export type AuditRunLogger = {
  start(header: AuditRunHeader): void;
  stageStart(stage: AuditStageInput): void;
  stageMessage(stage: AuditStageInput, message: GCMessage): void;
  stageEnd(stage: AuditStageInput, output: AuditStageOutput): void;
};

export async function readAuditEnvironment(cwd: string): Promise<RepoMetadata & { modelSelection: AgentModelSelection }> {
  const repoRoot = await readGitRepoRoot(cwd);
  const [branch, commitSha, modelSelection] = await Promise.all([
    readGitValue(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    readGitValue(repoRoot, ["rev-parse", "HEAD"]),
    readAgentModelSelection(repoRoot)
  ]);

  return {
    repoRoot,
    branch,
    commitSha,
    modelSelection
  };
}

export function formatAuditRunHeader(header: AuditRunHeader): string[] {
  const scopeText = header.scope.length > 0 ? header.scope.join(", ") : "(none)";
  const modelText = `${header.modelSelection.provider}/${header.modelSelection.model}`;
  const taskText = header.task ? ` task=${header.task}` : "";

  return [
    `[clawitup:audit] repo=${header.repoRoot}`,
    `[clawitup:audit] git=${header.branch} @ ${header.commitSha}`,
    `[clawitup:audit] model=${modelText} source=${header.modelSelection.raw}`,
    `[clawitup:audit] mode=${header.mode} scope=${scopeText}${taskText}`
  ];
}

export function createAuditRunLogger(stream: Writable = process.stdout): AuditRunLogger {
  return {
    start(header: AuditRunHeader) {
      for (const line of formatAuditRunHeader(header)) {
        stream.write(`${line}\n`);
      }
    },
    stageStart(stage: AuditStageInput) {
      stream.write(`[clawitup:audit] ${stage.name}: start\n`);
    },
    stageMessage(stage: AuditStageInput, message: GCMessage) {
      stream.write(`[clawitup:audit] ${stage.name}: ${formatMessage(message)}\n`);
    },
    stageEnd(stage: AuditStageInput, output: AuditStageOutput) {
      stream.write(`[clawitup:audit] ${stage.name}: ${formatStageEnd(output)}\n`);
    }
  };
}

export function formatMessage(message: GCMessage): string {
  switch (message.type) {
    case "delta":
      return `delta(${message.deltaType}) ${preview(message.content)}`;
    case "assistant":
      return `assistant stop=${message.stopReason} ${preview(message.content)}${formatThinking(message.thinking)}${formatUsage(message.usage)}`;
    case "tool_use":
      return `tool_use ${message.toolName} ${preview(stableJson(message.args))}`;
    case "tool_result":
      return `tool_result ${message.toolName}${message.isError ? " error" : ""} ${preview(message.content)}`;
    case "system":
      return `system ${message.subtype} ${preview(message.content)}`;
    case "user":
      return `user ${preview(message.content)}`;
  }
}

function formatStageEnd(output: AuditStageOutput): string {
  const parts: string[] = ["complete"];

  if (Array.isArray(output.findingIds) && output.findingIds.length > 0) {
    parts.push(`findingIds=${output.findingIds.join(",")}`);
  }

  if (Array.isArray(output.verifiedFindingIds) && output.verifiedFindingIds.length > 0) {
    parts.push(`verifiedFindingIds=${output.verifiedFindingIds.join(",")}`);
  }

  if (typeof output.report === "string" && output.report.trim().length > 0) {
    parts.push(`report=${preview(output.report)}`);
  }

  if (typeof output.notes === "string" && output.notes.trim().length > 0) {
    parts.push(`notes=${preview(output.notes)}`);
  }

  return parts.join(" ");
}

function formatUsage(
  usage:
    | {
        totalTokens: number;
      }
    | undefined
): string {
  return usage ? ` tokens=${usage.totalTokens}` : "";
}

function formatThinking(thinking: string | undefined): string {
  return thinking ? ` thinking=${preview(thinking)}` : "";
}

function preview(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= MESSAGE_PREVIEW_LIMIT) {
    return normalized;
  }

  return `${normalized.slice(0, MESSAGE_PREVIEW_LIMIT - 3)}...`;
}

function stableJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

async function readGitRepoRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], {
      cwd
    });

    return stdout.trim();
  } catch {
    return cwd;
  }
}

async function readGitValue(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd
    });

    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

export async function readAgentModelSelection(repoRoot: string): Promise<AgentModelSelection> {
  try {
    const contents = await fs.readFile(`${repoRoot}/agent.yaml`, "utf8");
    const preferredMatch = contents.match(/^\s*preferred:\s*["']?([^"'\n]+)["']?\s*$/m);
    const raw = preferredMatch?.[1]?.trim() || "unknown";
    const separator = raw.indexOf(":");

    if (separator <= 0) {
      return {
        provider: "unknown",
        model: raw,
        raw
      };
    }

    return {
      provider: raw.slice(0, separator),
      model: raw.slice(separator + 1),
      raw
    };
  } catch {
    return {
      provider: "unknown",
      model: "unknown",
      raw: "unknown"
    };
  }
}
