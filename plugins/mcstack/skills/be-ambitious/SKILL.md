---
name: be-ambitious
description: "Raise a task or prompt using Felix Rieseberg's three types of ambition: Altitude (aim at the goal beyond the goal), Depth (work like the field's best, from raw material, checked by an outside judge), and Range (bring in other fields and do what their experts do). Shows the plan and a rewritten prompt, then does the work when handed a task. Better, not bigger. Use for /be-ambitious, 'be more ambitious', 'aim higher', 'what would a top expert do here'."
disable-model-invocation: true
---

# Be ambitious

Most tasks get done at the size they were typed. This skill aims them higher: at the outcome the task serves, at the standard the field's best would hold, and through the fields that could help. It follows Felix Rieseberg's [How to be more ambitious: a tutorial for humans with models](https://felixrieseberg.com/how-to-be-more-ambitious-a-tutorial-for-humans-with-models/).

The **sharpen** skill applies the Depth questions silently and gets on with the work. This skill shows its reasoning, adds Altitude and Range, and hands back a rewritten prompt.

## Hold these lines

1. **Better, not bigger.** Each type raises the outcome, the standard, or the set of perspectives. None of them adds deliverables, features, or side quests. Drop any suggestion that makes the job larger without making it better.
2. **Do what the expert does, not how they talk.** Use the field's methods and instruments. New vocabulary on old methods is role play: the transcript gets weirder and the result stays the same.
3. **An outside judge decides.** Never grade your own work. Name something other than you or the user that shows the result is right (a test, a benchmark, a reproduction, held-out data, a measurement, a real user's behavior), and say what counts as a pass and what counts as a fail. Prefer a judge you can run for fast feedback.
4. **Treat the hard target as reasonable, and report it honestly.** Specific hard goals beat "do your best". A hard target raises the standard for the same deliverable. It is not a license to widen scope. A missed target with real numbers is a good result. A faked one is not.
5. **Get the access, don't fake it.** Ambition needs a machine you can install tools on and the real data. If either is missing, name what is missing and what it would unlock. If you don't know a field well enough to name its sources or tools, say so. Never invent a source, tool, or result.
6. **Ambition raises the standard, not the permissions.** Ask first when a step replaces what the user asked for instead of raising it, spends money, or can't be undone.

## Read the input

The task is whatever follows `/be-ambitious`. If nothing follows, use the user's most recent request. If there is none, ask for the task in one line and stop.

Decide what you were handed:

- **A task to do** (fix, build, analyze): plan it at the ambitious level, then do it.
- **A prompt to improve** (a rewrite request, or a prompt meant for another agent or tool): stop after the rewritten prompt.

If you can't tell, treat it as a prompt to improve.

## Pick the types that fit

Speed, the same work in less time, is the fourth type in the article. It needs no creativity, so this skill skips it. Use the other three only where they fit. Most tasks need one or two.

| Type | Fits when | Skip when |
|---|---|---|
| Altitude | The task serves an outcome. A tell: people would hold meetings about it | Creative work with no outcome beyond itself |
| Depth | The task should be done really well | Throwaway work |
| Range | The result has to land with people, or the obvious field has run out of ideas | A narrow fix with one right answer |

Scale the effort to the stakes. A one-line prompt gets a few lines of plan, because the rewritten prompt is the product.

### Altitude: aim at the outcome

Ask what the user wants to happen after the task is done. Build a ladder of three rungs, each more ambitious than the last. For a quarterly business review deck:

1. **Understand, don't fill in.** Skip updating the template. Take in all the data and work out what changed, why, and what to do about it.
2. **Get to the decisions.** Find the three most urgent decisions and draft directions with arguments for and against.
3. **Replace the ritual.** The review exists so leadership catches problems early. Design a better way to do that, show from the company's own history that it would have caught things sooner, and run it beside the current review for a quarter.

The top rung is where durable workflows live, the ones that take the human out of the loop. They usually need setup first. Before an agent can keep apps crash-free, it needs to fetch crash reports, map each version to its commit, and reproduce fixes on every platform. Name that setup in the plan.

If a rung has no outside judge, step down one rung. "Go make money" is too high for most work.

### Depth: work like the field's best

Name the field first ("SRE incident response", "investigative journalism", "clinical pharmacology"). Then answer Felix's prompt for that field:

> I want a deeper version of this task, not a bigger one. Before rewriting it: (1) say what a top professional in this field would do here that I'm not asking for; (2) name the rawest material they would start from instead of what has already been digested for me; (3) name the specific methods and tools they would use; (4) say what, other than you or me, would show the result is right. Then rewrite my prompt to ask for exactly that.

Be concrete in each answer. Name the actual thing, not the category.

1. **The expert moves.** The two or three moves that separate expert work from competent work here: state the decision the work serves, check base rates, reproduce before fixing, write the counter-argument.
2. **The rawest material.** The dataset, not the chart. The filing, not the article. The logs and the code, not the bug report. The methods section, not the abstract. Say where it lives.
3. **The instruments.** Where you'd reach for a markdown table, a data scientist reaches for a database and a statistical model. Name each technique, library, or command, and why it fits.
4. **The judge.** Rule 3, with its pass and fail.

Then push past the field's habits:

- **Set the hard target.** The page loads in 8 seconds and the user asked for 5? Aim for 200 milliseconds, and measure the baseline first.
- **Test the belief.** Get the raw data and try to reproduce what everyone assumes, adversarially: "We believe churn is an onboarding problem. Try to reproduce that from the raw data."
- **Look for new knowledge.** Once deep in the data, look for the signal nobody has found yet, and show it holds on data it has not seen.

### Range: bring in other fields

- **Replace the nouns with verbs** (from Tom Kelley and Jonathan Littman's *The Art of Innovation*). A quarterly review isn't "a deck". It's "getting busy people to believe a story about cause and effect, and to decide under uncertainty, in 30 minutes". The verbs show which fields can help.
- **Assemble the crew.** For quality: an analyst, a journalist, and an editor. If it is presented: a motion designer. As a red team: a short seller and a forensic accountant.
- **Borrow their tools, not only their ideas.** A field brings its software: a 3D tool such as Blender can answer a design question that prose can't.
- **Do, don't play** (rule 2). Don't write like a short seller. Do what a short seller does to research a position. Give each field its own subagent with that field's method and tools: the **swarm** skill for parallel slices, the **arena** skill when several attempts at one brief should be merged.

## Write the output

In this order:

1. **The goal beyond the goal**, in one line.
2. **The types that fit**, one line each on why, and the ones you skipped.
3. **The plan** for each picked type. Altitude: the ladder. Depth: the field, the four answers, and the hard target. Range: the verbs, then each crew member as field, the job they actually do, and the method or tool they use.
4. **What it needs**: data, tools, and access, each marked as present or missing.
5. **The rewritten prompt** in one fenced block, in the user's voice, about as long as it needs to be. It starts from the raw material, names the methods, and ends with the outside judge and its pass and fail.
6. **Next.** Pick the highest rung you can finish and check with the access you have now. For a prompt to improve, name that rung, offer in one line to run it, and stop. For a task to do, name it in one line and start, unless rule 6 says to ask. If even the first rung needs access you don't have, ask for it and stop.

When you do the work, verify against the judge before you call it done (the **principle-prove-it-works** skill). If the chosen rung spans many phases or runs while the user is away, run it through the **figure-it-out** skill, which keeps a **show-me-your-work** decision trail.

## Example

`/be-ambitious fix the crash in the login screen`

- **Goal beyond the goal:** people can always log in.
- **Types:** Altitude and Depth. Range skipped, since a crash fix has one right answer.
- **Altitude:** (1) fix this crash with a test that fails before and passes after; (2) find every crash of this kind in the crash reports and fix the cause; (3) keep login crash-free: fetch crash reports, map versions to commits, reproduce on every platform, and fix without waiting to be asked.
- **Depth:** the field is mobile crash triage. Start from the raw crash dumps and logs, not the bug report. Symbolicate, reproduce before fixing. Target zero login crashes in the next release.
- **Judge:** pass when the new test fails before the fix and passes after, and the crash reporter shows zero login crashes for the build. Fail if the crash reproduces on any platform.
- **Next:** rung 2 if the crash reports are reachable from here, otherwise rung 1 and a request for crash-report access.
