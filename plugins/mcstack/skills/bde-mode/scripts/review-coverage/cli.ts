import { run } from "../watch-pr/github.ts";
import {
  coverage,
  headReviewed,
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

// gh pr view gives a comment's creation time only, and CodeRabbit rewrites its summary comment in
// place, so the time its next-review delay counts from comes from GraphQL. gh api defaults to
// github.com, so the PR's own host is passed for an enterprise PR.
async function editedAt(
  runtime: CliRuntime,
  host: string,
  comment: string
): Promise<Date> {
  const result = await runtime.gh([
    "api",
    "graphql",
    "--hostname",
    host,
    "-f",
    "query=query($id: ID!) { node(id: $id) { ... on IssueComment { createdAt lastEditedAt } } }",
    "-F",
    `id=${comment}`,
  ]);
  if (result.code !== 0)
    throw new Error(
      `gh api graphql for comment ${comment} failed: ${result.stderr.trim()}`
    );
  const node = (JSON.parse(result.stdout) as { data?: { node?: unknown } }).data
    ?.node;
  if (typeof node !== "object" || node === null)
    throw new Error(`comment ${comment} not found`);
  const { createdAt, lastEditedAt } = node as Record<string, unknown>;
  const time = new Date(String(lastEditedAt ?? createdAt));
  if (Number.isNaN(time.getTime()))
    throw new Error(`comment ${comment} has no edit time`);
  return time;
}

/**
 * Prints the commit each review bot covered against the PR head.
 *
 * Exits 0 when every bot with a record on the PR that reviews line by line covered the head, 1
 * when one missed it or no such bot left a record, and 2 when the check could not run. A
 * summary-only bot is printed but never decides the exit.
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
  let host: string;
  const edits = new Map<string, Date>();
  try {
    const result = await runtime.gh([
      "pr",
      "view",
      args[0]!,
      ...(repo === null ? [] : ["--repo", repo]),
      "--json",
      "url,headRefOid,reviews,comments,statusCheckRollup",
    ]);
    if (result.code !== 0) {
      runtime.stderr(`gh pr view failed: ${result.stderr.trim()}\n`);
      return 2;
    }
    const json: unknown = JSON.parse(result.stdout);
    report = coverage(parsePullRequest(json));
    const url = (json as { url?: unknown }).url;
    if (typeof url !== "string")
      throw new Error(`url: expected a string, got ${JSON.stringify(url)}`);
    host = new URL(url).host;
  } catch (error) {
    // Exit 1 means a bot missed the head, so an uncaught error must not exit with it.
    runtime.stderr(`review-coverage: ${describe(error)}\n`);
    return 2;
  }
  // The edit time only turns a stated delay into a time, so failing to read it keeps the delay
  // and says why rather than discarding the coverage report.
  for (const bot of report.bots)
    if (bot.nextReview !== null && bot.nextReview.minutes !== null)
      try {
        edits.set(
          bot.nextReview.comment,
          await editedAt(runtime, host, bot.nextReview.comment)
        );
      } catch (error) {
        runtime.stderr(
          `review-coverage: printing ${bot.bot}'s next review as a delay: ${describe(error)}\n`
        );
      }
  runtime.stdout(render(report, edits));
  return headReviewed(report) ? 0 : 1;
}
