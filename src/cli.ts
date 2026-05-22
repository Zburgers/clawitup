import { Command } from "commander";

export function buildCli(): Command {
  const cli = new Command("clawitup");

  cli.command("init");
  cli.command("audit");
  cli.command("status");
  cli.command("report");
  cli.command("memory");
  cli.command("eval");

  return cli;
}
