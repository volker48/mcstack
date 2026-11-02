import { run } from "../watch-pr/github.ts";
import {
  coverage,
  covered,
  parsePullRequest,
  render,
  type Report,
} from "./coverage.ts";

const USAGE = "usage: review-coverage <pr> [--repo <owner/name>]";

export interface CliRuntime {
  readonly gh: (
    args: readonly string[]
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

export const defaultRuntime: CliRuntime = {
  gh: (args) => run(["gh", ...args]),
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause === undefined
    ? error.message
    : `${error.message}: ${describe(error.cause)}`;
}

/**
 * Prints the commit each review bot covered against the PR head.
 *
 * Exits 0 when every bot with a record on the PR covered or summarized the head, 1 when one
 * missed it or no bot left a record, and 2 when the check could not run.
 */
export async function main(
  argv: readonly string[],
  runtime = defaultRuntime
): Promise<number> {
  const args = [...argv];
  let repo: string | null = null;
  const at = args.findIndex((arg) => arg === "--repo" || arg === "-R");
  if (at >= 0) {
    repo = args[at + 1] ?? null;
    if (repo === null) {
      runtime.stderr(`${USAGE}\n`);
      return 2;
    }
    args.splice(at, 2);
  }
  if (args.length !== 1 || args[0]!.startsWith("-")) {
    runtime.stderr(`${USAGE}\n`);
    return 2;
  }
  let report: Report;
  try {
    const result = await runtime.gh([
      "pr",
      "view",
      args[0]!,
      ...(repo === null ? [] : ["--repo", repo]),
      "--json",
      "headRefOid,reviews,comments,statusCheckRollup",
    ]);
    if (result.code !== 0) {
      runtime.stderr(`gh pr view failed: ${result.stderr.trim()}\n`);
      return 2;
    }
    report = coverage(parsePullRequest(JSON.parse(result.stdout)));
  } catch (error) {
    // Exit 1 means a bot missed the head, so an uncaught error must not exit with it.
    runtime.stderr(`review-coverage: ${describe(error)}\n`);
    return 2;
  }
  runtime.stdout(render(report));
  return report.bots.length > 0 &&
    report.bots.every((bot) => covered(report, bot))
    ? 0
    : 1;
}
