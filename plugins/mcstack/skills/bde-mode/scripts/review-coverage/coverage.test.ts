import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type CliRuntime, main } from "./cli.ts";
import { coverage, parsePullRequest, render, type Sha } from "./coverage.ts";

// `gh pr view --json headRefOid,reviews,comments,statusCheckRollup` output. mcstack-5 is a snapshot of
// that public PR. The free-plan ones are synthetic, because the PRs they stand for are private: they
// keep the bots' markup from those PRs and replace the content and commits.
function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(import.meta.dir, "fixtures", `${name}.json`), "utf8")
  );
}

const A = "a".repeat(40) as Sha;
const B = "b".repeat(40) as Sha;

function pr(overrides: Record<string, unknown> = {}): unknown {
  return {
    headRefOid: B,
    reviews: [],
    comments: [],
    statusCheckRollup: [],
    ...overrides,
  };
}

function codexState(sha: string, status = "completed", spacing = ""): string {
  return `<!-- codex-review-state:v1 {"code_review":{"commit_sha":${spacing}"${sha}","status":${spacing}"${status}"},"security_review":{"commit_sha":null}} -->`;
}

function runtime(
  stdout: string,
  graphql = JSON.stringify({
    data: { node: { createdAt: "2026-11-01T16:00:00Z", lastEditedAt: null } },
  })
): {
  runtime: CliRuntime;
  out: string[];
  args: string[][];
} {
  const out: string[] = [];
  const args: string[][] = [];
  return {
    out,
    args,
    runtime: {
      gh: async (a) => {
        args.push([...a]);
        return {
          code: 0,
          stdout: a[0] === "api" ? graphql : stdout,
          stderr: "",
        };
      },
      stdout: (text) => out.push(text),
      stderr: (text) => out.push(text),
    },
  };
}

describe("pull requests", () => {
  it("a rate-limited Free-plan CodeRabbit and Codex both stopped a commit short of the head", () => {
    const report = coverage(parsePullRequest(fixture("free-plan-limited")));
    expect(render(report)).toBe(
      [
        "head 352f7829a2384b001cc12b0c2613c756454a1f6a",
        "coderabbitai             MISSED the head; summarized e0996a37c13d; Free plan, a summary without line-by-line review; Review limit reached, skipped e0996a37c13d..352f7829a238; next review available in 57 minutes",
        "chatgpt-codex-connector  MISSED the head; reviewed e0996a37c13d",
        "no record from cubic-dev-ai",
        "",
      ].join("\n")
    );
  });

  it("a Free-plan CodeRabbit only summarized the head, and Codex reviewed it", () => {
    const report = coverage(parsePullRequest(fixture("free-plan-summarized")));
    expect(render(report)).toBe(
      [
        `head ${report.head}`,
        "coderabbitai             summarized the head; Free plan, a summary without line-by-line review",
        "chatgpt-codex-connector  covered the head",
        "no record from cubic-dev-ai",
        "",
      ].join("\n")
    );
  });

  it("mcstack#5: line reviews, a findings-free Codex pass and cubic's check run cover the head", () => {
    const report = coverage(parsePullRequest(fixture("mcstack-5")));
    expect(render(report)).toBe(
      [
        "head b9316746be20a220d160b899952f491b36c0072e",
        "coderabbitai             covered the head; 3 outside-diff findings only in the body of its review of 3d0f5cb0ac01",
        "chatgpt-codex-connector  covered the head",
        "cubic-dev-ai             covered the head",
        "",
      ].join("\n")
    );
  });
});

describe("records", () => {
  it("ignores a marker in a comment from anyone but the bot", () => {
    const report = coverage(
      parsePullRequest(
        pr({
          comments: [
            { id: "IC_1", author: { login: "volker48" }, body: codexState(B) },
          ],
        })
      )
    );
    expect(report.bots).toEqual([]);
  });

  it("does not count a bot's empty COMMENTED review, which is a thread reply", () => {
    const reviews = [
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "",
        commit: { oid: B },
      },
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "Actionable comments: 1",
        commit: { oid: A },
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ reviews }))).bots;
    expect(bot?.reviewed).toEqual([A]);
  });

  it("skips a review whose commit no longer exists", () => {
    const reviews = [
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "Actionable comments: 1",
        commit: null,
      },
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "Actionable comments: 0",
        commit: { oid: B },
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ reviews }))).bots;
    expect(bot?.reviewed).toEqual([B]);
  });

  it("counts a bot's approval without a body", () => {
    const reviews = [
      {
        author: { login: "coderabbitai" },
        state: "APPROVED",
        body: "",
        commit: { oid: B },
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ reviews }))).bots;
    expect(bot?.reviewed).toEqual([B]);
  });

  it("reads Codex's state as JSON, whatever its spacing", () => {
    const comments = [
      {
        id: "IC_1",
        author: { login: "chatgpt-codex-connector" },
        body: codexState(B, "completed", " "),
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ comments }))).bots;
    expect(bot?.reviewed).toEqual([B]);
  });

  it("does not count a Codex review that has not completed", () => {
    const comments = [
      {
        id: "IC_1",
        author: { login: "chatgpt-codex-connector" },
        body: codexState(B, "in_progress"),
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ comments }))).bots;
    expect(bot).toEqual({
      bot: "chatgpt-codex-connector",
      reviewed: [],
      notes: ["Codex review in_progress"],
      summaryOnly: false,
      bodyFindings: [],
      nextReview: null,
    });
  });

  it("counts a CodeRabbit range only in its finished review, not in the rate-limit notice", () => {
    const body = [
      "<!-- This is an auto-generated comment: rate limited by coderabbit.ai -->",
      `Reviewing files that changed from the base of the PR and between ${A} and ${B}.`,
      "<!-- end of auto-generated comment: rate limited by coderabbit.ai -->",
    ].join("\n");
    const [bot] = coverage(
      parsePullRequest(
        pr({
          comments: [{ id: "IC_1", author: { login: "coderabbitai" }, body }],
        })
      )
    ).bots;
    expect(bot?.reviewed).toEqual([]);
  });

  it("notes CodeRabbit's paused notice once", () => {
    const body = [
      "<!-- This is an auto-generated comment: review paused by coderabbit.ai -->",
      "> ## Reviews paused",
      "<!-- end of auto-generated comment: review paused by coderabbit.ai -->",
    ].join("\n");
    const [bot] = coverage(
      parsePullRequest(
        pr({
          comments: [{ id: "IC_1", author: { login: "coderabbitai" }, body }],
        })
      )
    ).bots;
    expect(bot?.notes).toEqual(["Reviews paused"]);
  });

  it("does not count a cubic check run that did not succeed", () => {
    const statusCheckRollup = [
      {
        __typename: "CheckRun",
        name: "cubic · AI code reviewer",
        status: "IN_PROGRESS",
      },
    ];
    const [bot] = coverage(parsePullRequest(pr({ statusCheckRollup }))).bots;
    expect(bot).toEqual({
      bot: "cubic-dev-ai",
      reviewed: [],
      notes: ["cubic check in_progress"],
      summaryOnly: false,
      bodyFindings: [],
      nextReview: null,
    });
  });

  it("counts CodeRabbit's findings that live only in a review body, per reviewed commit", () => {
    const reviews = [
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "**⚠️ Outside diff range comments (2)**\n<summary>🧹 Nitpick comments (1)</summary>",
        commit: { oid: A },
      },
      {
        author: { login: "coderabbitai" },
        state: "COMMENTED",
        body: "Actionable comments posted: 0",
        commit: { oid: B },
      },
    ];
    const report = coverage(parsePullRequest(pr({ reviews })));
    expect(render(report)).toContain(
      "covered the head; 2 outside-diff findings only in the body of its review of aaaaaaaaaaaa; 1 nitpick finding only in the body of its review of aaaaaaaaaaaa"
    );
  });

  it("keeps CodeRabbit's next-review wording when it names no duration", () => {
    const body = [
      "<!-- This is an auto-generated comment: rate limited by coderabbit.ai -->",
      "> **Next included review available in a moment.**",
      "<!-- end of auto-generated comment: rate limited by coderabbit.ai -->",
    ].join("\n");
    const report = coverage(
      parsePullRequest(
        pr({
          comments: [{ id: "IC_1", author: { login: "coderabbitai" }, body }],
        })
      )
    );
    expect(report.bots[0]?.nextReview).toEqual({
      comment: "IC_1",
      minutes: null,
      text: "a moment",
    });
    expect(render(report)).toContain("next review available in a moment");
  });

  it("rejects output that is not a pull request", () => {
    expect(() => parsePullRequest({ headRefOid: "main" })).toThrow(
      "headRefOid"
    );
  });
});

describe("main", () => {
  it("passes the PR and repository to gh and exits 1 when a bot missed the head", async () => {
    const {
      runtime: rt,
      out,
      args,
    } = runtime(JSON.stringify(fixture("free-plan-limited")));
    expect(await main(["150", "--repo", "octo/repo"], rt)).toBe(1);
    expect(args[0]).toEqual([
      "pr",
      "view",
      "150",
      "--repo",
      "octo/repo",
      "--json",
      "headRefOid,reviews,comments,statusCheckRollup",
    ]);
    expect(out.join("")).toContain("MISSED the head");
  });

  it("prints CodeRabbit's next review as a time counted from the notice's last edit", async () => {
    const {
      runtime: rt,
      out,
      args,
    } = runtime(
      JSON.stringify(fixture("free-plan-limited")),
      JSON.stringify({
        data: {
          node: {
            createdAt: "2026-11-01T16:08:09Z",
            lastEditedAt: "2026-11-01T17:10:30Z",
          },
        },
      })
    );
    await main(["150"], rt);
    expect(args[1]).toContain("id=IC_free-plan-limited-1");
    expect(out.join("")).toContain(
      "next review available at 2026-11-01T18:07:30Z"
    );
  });

  it("exits 2 when the notice's edit time cannot be read", async () => {
    const { runtime: rt, out } = runtime(
      JSON.stringify(fixture("free-plan-limited")),
      JSON.stringify({ data: { node: null } })
    );
    expect(await main(["150"], rt)).toBe(2);
    expect(out.join("")).toBe(
      "review-coverage: comment IC_free-plan-limited-1 not found\n"
    );
  });

  it("exits 0 when only a summary-only bot missed the head", async () => {
    const comments = [
      {
        id: "IC_1",
        author: { login: "coderabbitai" },
        body: `- **Plan**: Free\n<!-- recent_review_start -->between ${A} and ${A}.<!-- recent_review_end -->`,
      },
      {
        id: "IC_2",
        author: { login: "chatgpt-codex-connector" },
        body: codexState(B),
      },
    ];
    const { runtime: rt, out } = runtime(JSON.stringify(pr({ comments })));
    expect(await main(["5"], rt)).toBe(0);
    expect(out.join("")).toContain("coderabbitai             MISSED the head");
  });

  it("exits 1 when only a summary-only bot left a record, since nothing reviewed the head", async () => {
    const comments = [
      {
        id: "IC_1",
        author: { login: "coderabbitai" },
        body: `- **Plan**: Free\n<!-- recent_review_start -->between ${A} and ${B}.<!-- recent_review_end -->`,
      },
    ];
    const { runtime: rt } = runtime(JSON.stringify(pr({ comments })));
    expect(await main(["5"], rt)).toBe(1);
  });

  it("exits 0 when every bot covered the head", async () => {
    const { runtime: rt } = runtime(
      JSON.stringify(fixture("free-plan-summarized"))
    );
    expect(await main(["168"], rt)).toBe(0);
  });

  it("exits 2, not 1, when gh prints something that is not a pull request", async () => {
    for (const stdout of ["not json", JSON.stringify({ headRefOid: "main" })]) {
      const { runtime: rt, out } = runtime(stdout);
      expect(await main(["5"], rt)).toBe(2);
      expect(out.join("")).toStartWith("review-coverage: ");
    }
  });

  it("exits 2 when gh cannot be started", async () => {
    const { runtime: rt, out } = runtime("");
    const failing: CliRuntime = {
      ...rt,
      gh: async () => {
        throw new Error("spawn gh ENOENT");
      },
    };
    expect(await main(["5"], failing)).toBe(2);
    expect(out.join("")).toBe("review-coverage: spawn gh ENOENT\n");
  });

  it("exits 1 when no bot left a record, since nothing reviewed the head", async () => {
    const { runtime: rt, out } = runtime(JSON.stringify(pr()));
    expect(await main(["5"], rt)).toBe(1);
    expect(out.join("")).toContain(
      "no record from coderabbitai, chatgpt-codex-connector, cubic-dev-ai"
    );
  });

  it("exits 2 without a PR", async () => {
    const { runtime: rt, out } = runtime("{}");
    expect(await main([], rt)).toBe(2);
    expect(out.join("")).toContain("usage:");
  });
});
