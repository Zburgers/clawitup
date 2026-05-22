import { Command } from "commander";
import { runInit } from "./commands/init.js";

export function buildCli(): Command {
  const cli = new Command("clawitup");

  cli.command("init").description("Initialize the repo-native ClawItUp structure").action(async () => {
    await runInit();
  });
  cli.command("audit");
  cli.command("status");
  cli.command("report");
  cli.command("memory");
  cli.command("eval");

  return cli;
}
