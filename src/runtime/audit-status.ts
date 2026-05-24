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

export async function readAuditEnvironment(
  cwd: string,
  modelOverride?: string
): Promise<RepoMetadata & { modelSelection: AgentModelSelection }> {
  const repoRoot = await readGitRepoRoot(cwd);
  const [branch, commitSha, modelSelection] = await Promise.all([
    readGitValue(repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
    readGitValue(repoRoot, ["rev-parse", "HEAD"]),
    modelOverride ? Promise.resolve(parseModelSelection(modelOverride)) : readAgentModelSelection(repoRoot)
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
  const taskText = header.task ? ` task=${header.task}` : "";

  return [
    `[clawitup:audit] repo=${header.repoRoot}`,
    `[clawitup:audit] git=${header.branch} @ ${header.commitSha}`,
    `[clawitup:audit] model=${header.modelSelection.raw} provider=${header.modelSelection.provider}`,
    `[clawitup:audit] mode=${header.mode} scope=${scopeText}${taskText}`
  ];
}

export function createAuditRunLogger(stream: Writable = process.stdout): AuditRunLogger {
  const theme = createTerminalTheme(stream);
  const stageState = new Map<
    string,
    {
      textStreamOpen: boolean;
      sawTextDelta: boolean;
    }
  >();

  return {
    start(header: AuditRunHeader) {
      for (const line of formatAuditRunHeader(header)) {
        stream.write(`${theme.header(line)}\n`);
      }
    },
    stageStart(stage: AuditStageInput) {
      stageState.set(stage.name, {
        textStreamOpen: false,
        sawTextDelta: false
      });
      stream.write(`${theme.stageStart(formatStageLabel(stage))}\n`);
    },
    stageMessage(stage: AuditStageInput, message: GCMessage) {
      const state = stageState.get(stage.name) ?? {
        textStreamOpen: false,
        sawTextDelta: false
      };

      if (message.type === "delta" && message.deltaType === "text") {
        if (!state.textStreamOpen) {
          stream.write(theme.streamPrefix(formatStageLabel(stage)));
          state.textStreamOpen = true;
        }
        state.sawTextDelta = true;
        stream.write(message.content);
        stageState.set(stage.name, state);
        return;
      }

      if (state.textStreamOpen) {
        stream.write("\n");
        state.textStreamOpen = false;
        stageState.set(stage.name, state);
      }

      const formatted = formatMessage(message, state.sawTextDelta);
      if (formatted) {
        stream.write(`${theme.eventLine(formatStageLabel(stage), message, formatted)}\n`);
      }
    },
    stageEnd(stage: AuditStageInput, output: AuditStageOutput) {
      const state = stageState.get(stage.name);
      if (state?.textStreamOpen) {
        stream.write("\n");
      }
      stageState.delete(stage.name);
      stream.write(`${theme.stageEnd(formatStageLabel(stage), output)}\n`);
    }
  };
}

function formatStageLabel(stage: AuditStageInput): string {
  return `${stage.index}/${stage.total} ${stage.name}`;
}

export function formatMessage(message: GCMessage, suppressAssistantPreview = false): string | undefined {
  switch (message.type) {
    case "delta":
      if (message.deltaType === "thinking") {
        return undefined;
      }
      return `delta(${message.deltaType}) ${preview(message.content)}`;
    case "assistant":
      return suppressAssistantPreview
        ? `assistant stop=${message.stopReason}${formatUsage(message.usage)}`
        : `assistant stop=${message.stopReason} ${preview(message.content)}${formatUsage(message.usage)}`;
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

function createTerminalTheme(stream: Writable) {
  const supportsColor = "isTTY" in stream ? Boolean((stream as Writable & { isTTY?: boolean }).isTTY) : false;
  const color = (code: number, value: string) => (supportsColor ? `\x1b[${code}m${value}\x1b[0m` : value);
  const bold = (value: string) => color(1, value);
  const dim = (value: string) => color(2, value);
  const cyan = (value: string) => color(36, value);
  const blue = (value: string) => color(34, value);
  const green = (value: string) => color(32, value);
  const yellow = (value: string) => color(33, value);
  const red = (value: string) => color(31, value);
  const magenta = (value: string) => color(35, value);

  const prefix = dim("[clawitup:audit]");

  return {
    header(line: string) {
      return line.replace("[clawitup:audit]", prefix);
    },
    stageStart(label: string) {
      return `${prefix} ${cyan(`◐ ${bold(label)}`)} ${dim("start")}`;
    },
    streamPrefix(label: string) {
      return `${prefix} ${blue(`│ ${bold(label)}`)} `;
    },
    eventLine(label: string, message: GCMessage, formatted: string) {
      const eventText = (() => {
        switch (message.type) {
          case "assistant":
            return green(`assistant ${formatted.replace(/^assistant\s*/, "")}`);
          case "tool_use":
            return blue(`tool ${formatted.replace(/^tool_use\s*/, "")}`);
          case "tool_result":
            return message.isError
              ? red(`tool ${formatted.replace(/^tool_result\s*/, "")}`)
              : dim(`tool ${formatted.replace(/^tool_result\s*/, "")}`);
          case "system":
            return message.subtype === "error"
              ? red(`system ${formatted.replace(/^system\s*/, "")}`)
              : yellow(`system ${formatted.replace(/^system\s*/, "")}`);
          case "user":
            return magenta(formatted);
          default:
            return formatted;
        }
      })();

      return `${prefix} ${dim(label)} ${eventText}`;
    },
    stageEnd(label: string, output: AuditStageOutput) {
      const text = formatStageEnd(output);
      const coloredText = output.error ? red(text) : green(text);
      return `${prefix} ${output.error ? red(`✗ ${bold(label)}`) : green(`✓ ${bold(label)}`)} ${coloredText}`;
    }
  };
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
    return parseModelSelection(preferredMatch?.[1]?.trim() || "unknown");
  } catch {
    return {
      provider: "unknown",
      model: "unknown",
      raw: "unknown"
    };
  }
}

function parseModelSelection(raw: string): AgentModelSelection {
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
}
