import { runEval, type EvalRunResult } from "../runtime/eval-runner.js";

export async function runEvalCommand(
  fixturePath: string,
  cwd = process.cwd()
): Promise<EvalRunResult> {
  return runEval(fixturePath, cwd);
}

export async function printEvalCommand(
  fixturePath: string,
  cwd = process.cwd()
): Promise<EvalRunResult> {
  const result = await runEvalCommand(fixturePath, cwd);

  process.stdout.write(`${result.artifacts.markdown}\n`);
  process.stdout.write(`${result.artifacts.json}\n`);

  return result;
}
