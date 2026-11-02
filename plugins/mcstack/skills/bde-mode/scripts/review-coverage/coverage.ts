// Which commits of a pull request each review bot covered, read from the records the bots leave
// on GitHub. A bot's silence covers only the commits it reviewed, so the head counts as reviewed
// only when one of these records names it.

export type Sha = string & { readonly __sha: unique symbol };

export interface PullRequest {
  readonly head: Sha;
  readonly reviews: readonly Review[];
  readonly comments: readonly Comment[];
  readonly checks: readonly CheckRun[];
}

interface Review {
  readonly login: string;
  readonly state: string;
  readonly body: string;
  readonly commit: Sha;
}

interface Comment {
  readonly login: string;
  readonly body: string;
}

interface CheckRun {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string;
}

export type Bot = "coderabbitai" | "chatgpt-codex-connector" | "cubic-dev-ai";

export const BOTS: readonly Bot[] = [
  "coderabbitai",
  "chatgpt-codex-connector",
  "cubic-dev-ai",
];

// cubic leaves no review when it finds nothing; its check run on the head is the record.
const CUBIC_CHECK = "cubic · AI code reviewer";

export interface BotCoverage {
  readonly bot: Bot;
  // Commits the bot's records say it reviewed, in the order the records appear.
  readonly reviewed: readonly Sha[];
  // Why the bot did not review the latest commits, in its own words, when it said so.
  readonly notes: readonly string[];
  // The bot's plan only summarizes a PR, so its records name commits it summarized and found
  // nothing in only because it never looked for findings.
  readonly summaryOnly: boolean;
}

export interface Report {
  readonly head: Sha;
  readonly bots: readonly BotCoverage[];
}

const SHA = /^[0-9a-f]{40}$/;

function sha(value: unknown, where: string): Sha {
  if (typeof value !== "string" || !SHA.test(value))
    throw new Error(
      `${where}: expected a 40-character commit SHA, got ${JSON.stringify(value)}`
    );
  return value as Sha;
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${where}: expected an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, where: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${where}: expected an array`);
  return value;
}

function string(value: unknown, where: string): string {
  if (typeof value !== "string") throw new Error(`${where}: expected a string`);
  return value;
}

function login(value: unknown, where: string): string {
  // A deleted account comes back as a null author.
  if (value === null) return "";
  return string(object(value, where).login, `${where}.login`);
}

/** Parses `gh pr view --json headRefOid,reviews,comments,statusCheckRollup` output. */
export function parsePullRequest(json: unknown): PullRequest {
  const pr = object(json, "pull request");
  return {
    head: sha(pr.headRefOid, "headRefOid"),
    reviews: array(pr.reviews, "reviews").map((raw, i) => {
      const review = object(raw, `reviews[${i}]`);
      return {
        login: login(review.author, `reviews[${i}].author`),
        state: string(review.state, `reviews[${i}].state`),
        body: string(review.body, `reviews[${i}].body`),
        commit: sha(
          object(review.commit, `reviews[${i}].commit`).oid,
          `reviews[${i}].commit.oid`
        ),
      };
    }),
    comments: array(pr.comments, "comments").map((raw, i) => {
      const comment = object(raw, `comments[${i}]`);
      return {
        login: login(comment.author, `comments[${i}].author`),
        body: string(comment.body, `comments[${i}].body`),
      };
    }),
    // Status contexts carry no name and no bot record, so only check runs are kept.
    checks: array(pr.statusCheckRollup ?? [], "statusCheckRollup").flatMap(
      (raw, i) => {
        const check = object(raw, `statusCheckRollup[${i}]`);
        if (check.__typename !== "CheckRun") return [];
        return [
          {
            name: string(check.name, `statusCheckRollup[${i}].name`),
            status: string(check.status, `statusCheckRollup[${i}].status`),
            conclusion:
              typeof check.conclusion === "string" ? check.conclusion : "",
          },
        ];
      }
    ),
  };
}

function between(text: string): Sha[] {
  return [...text.matchAll(/between ([0-9a-f]{40}) and ([0-9a-f]{40})/g)].map(
    (match) => match[2] as Sha
  );
}

function section(body: string, start: string, end: string): string | null {
  const from = body.indexOf(start);
  if (from < 0) return null;
  const to = body.indexOf(end, from);
  return body.slice(from, to < 0 ? undefined : to);
}

interface Facts {
  readonly reviewed: Sha[];
  readonly notes: string[];
  readonly summaryOnly?: boolean;
}

// CodeRabbit edits one summary comment in place. Its recent_review section names the range of
// its last finished review, and a rate-limit section names the range it is waiting to review.
// On the Free plan that review is a summary and a walkthrough, never line-by-line findings.
function codeRabbitComment(body: string): Facts {
  const reviewed: Sha[] = [];
  const notes: string[] = [];
  const summaryOnly = /- \*\*Plan\*\*: Free\b/.test(body);
  const recent = section(
    body,
    "<!-- recent_review_start -->",
    "<!-- recent_review_end -->"
  );
  if (recent !== null) reviewed.push(...between(recent));
  for (const match of body.matchAll(/head_sha=([0-9a-f]{40})/g))
    reviewed.push(match[1] as Sha);
  const limited = section(
    body,
    "<!-- This is an auto-generated comment: rate limited by coderabbit.ai -->",
    "<!-- end of auto-generated comment: rate limited by coderabbit.ai -->"
  );
  if (limited !== null) {
    const waiting = [
      ...limited.matchAll(/between ([0-9a-f]{40}) and ([0-9a-f]{40})/g),
    ];
    notes.push(
      "Review limit reached" +
        waiting
          .map((m) => `, skipped ${m[1]!.slice(0, 12)}..${m[2]!.slice(0, 12)}`)
          .join("")
    );
  }
  for (const match of body.matchAll(/Review skipped|Reviews? paused/g))
    notes.push(match[0]);
  return { reviewed, notes, summaryOnly };
}

// Codex keeps its state as JSON in an HTML comment of its summary. It posts no review when it
// finds nothing, so this is the only record of a clean pass.
function codexComment(body: string): Facts {
  const match = body.match(/<!-- codex-review-state:v1 (\{.*?\}) -->/s);
  if (!match) return { reviewed: [], notes: [] };
  let state: unknown;
  try {
    state = JSON.parse(match[1]!);
  } catch (error) {
    throw new Error("Codex's codex-review-state comment is not JSON", {
      cause: error,
    });
  }
  const review = object(
    object(state, "codex-review-state").code_review,
    "code_review"
  );
  if (review.status !== "completed")
    return { reviewed: [], notes: [`Codex review ${String(review.status)}`] };
  return {
    reviewed: [sha(review.commit_sha, "code_review.commit_sha")],
    notes: [],
  };
}

/** Collects each bot's reviewed commits. A bot with no record on the PR is left out. */
export function coverage(pr: PullRequest): Report {
  const bots = BOTS.map((bot): BotCoverage => {
    const reviewed: Sha[] = [];
    const notes: string[] = [];
    let summaryOnly = false;
    for (const review of pr.reviews) {
      // A COMMENTED review with no body is a reply in a thread, not a pass over the commit.
      if (
        review.login === bot &&
        (review.body !== "" || review.state !== "COMMENTED")
      )
        reviewed.push(review.commit);
    }
    for (const comment of pr.comments) {
      if (comment.login !== bot) continue;
      const facts: Facts =
        bot === "coderabbitai"
          ? codeRabbitComment(comment.body)
          : bot === "chatgpt-codex-connector"
            ? codexComment(comment.body)
            : { reviewed: [], notes: [] };
      reviewed.push(...facts.reviewed);
      notes.push(...facts.notes);
      summaryOnly ||= facts.summaryOnly === true;
    }
    if (bot === "cubic-dev-ai") {
      for (const check of pr.checks.filter((c) => c.name === CUBIC_CHECK)) {
        if (check.status === "COMPLETED" && check.conclusion === "SUCCESS")
          reviewed.push(pr.head);
        else
          notes.push(
            `cubic check ${check.status.toLowerCase()} ${check.conclusion.toLowerCase()}`.trim()
          );
      }
    }
    return {
      bot,
      reviewed: [...new Set(reviewed)],
      notes: [...new Set(notes)],
      summaryOnly,
    };
  });
  return {
    head: pr.head,
    bots: bots.filter((b) => b.reviewed.length > 0 || b.notes.length > 0),
  };
}

export function covered(report: Report, bot: BotCoverage): boolean {
  return bot.reviewed.includes(report.head);
}

const SUMMARY_ONLY = "Free plan, a summary without line-by-line review";

export function render(report: Report): string {
  const width = Math.max(0, ...report.bots.map((b) => b.bot.length));
  const lines = [`head ${report.head}`];
  for (const bot of report.bots) {
    const name = bot.bot.padEnd(width);
    const notes = [
      ...(bot.summaryOnly ? [SUMMARY_ONLY] : []),
      ...bot.notes,
    ].join("; ");
    const tail = notes === "" ? "" : `; ${notes}`;
    if (covered(report, bot))
      lines.push(
        `${name}  ${bot.summaryOnly ? "summarized" : "covered"} the head${tail}`
      );
    else
      lines.push(
        `${name}  MISSED the head; ${bot.summaryOnly ? "summarized" : "reviewed"} ${
          bot.reviewed.length > 0
            ? bot.reviewed.map((s) => s.slice(0, 12)).join(", ")
            : "nothing"
        }${tail}`
      );
  }
  const absent = BOTS.filter((b) => !report.bots.some((r) => r.bot === b));
  if (absent.length > 0) lines.push(`no record from ${absent.join(", ")}`);
  return `${lines.join("\n")}\n`;
}
