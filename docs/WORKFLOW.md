# Budget King — Task Workflow

This file defines how to implement a task from the roadmap. Follow it every time.

---

## Running a Task

Tell Claude Code:

> Implement task X.X

That's it. Claude Code will find the task in `roadmap.md`, read what it needs, and execute it using the process below.

---

## Process (Claude Code follows this for every task)

### 1. Read before touching anything

- Read `CLAUDE.md` if this is a new session
- Find the task in `roadmap.md` by its number (e.g. `3.2`)
- Read the full task: description, goal, and prompt
- Read `decisions.md` if the task touches auth, money, frequency math, state management, or DB schema — check for a relevant entry before proceeding

### 2. State your plan

Before writing any code, write a short plain-English plan:

```
Task X.X — [Task name]

Files I will create:
- path/to/file.ts

Files I will modify:
- path/to/existing.ts

What I will NOT do:
- [anything adjacent but out of scope]
```

Wait for confirmation before proceeding if anything in the plan is uncertain.

### 3. Implement

- Follow the task prompt from `roadmap.md` exactly
- Follow all rules in `CLAUDE.md`
- Do only what the task asks — nothing more
- If the task prompt references the spec (e.g. "from the spec", "as specified"), read the relevant section of `spec.md` before implementing
- If the task adds, removes, renames, or changes any API route, update `postman/budget-king.postman_collection.json` to match before committing

### 4. Verify

After implementing, confirm:

- [ ] The task's stated goal is met (re-read the goal line at the top of the task)
- [ ] TypeScript compiles without errors in affected packages (`pnpm --filter <package> tsc --noEmit`)
- [ ] If the task produces a running artifact (server, route, component), manually confirm it works
- [ ] No files were modified outside the scope stated in the plan
- [ ] If any route changed: `postman/budget-king.postman_collection.json` is updated to match

### 4.5. Commit

After verification passes, commit all changes to main:

1. Stage all task files: `git add <specific files>` — never `git add -A` (avoid accidentally staging `.env` or other sensitive files)
2. Write a concise commit message describing what the task built — no Claude attribution, no "Co-Authored-By" lines
3. Commit: `git commit -m "<message>"`

If the project is on a branch other than main, merge to main after committing:
```bash
git checkout main && git merge <branch> --no-ff -m "Merge task X.X — <description>"
```

For solo work on main (the default), just commit directly — no merge needed.

### 5. Summarize

Write a short completion summary:

```
Task X.X complete.

Created:
- path/to/file.ts — [one line description]

Modified:
- path/to/existing.ts — [what changed]

Verified:
- [how you confirmed it works]

Ready for task X.X+1.
```

---

## Rules

**Do not skip ahead.** Complete the current task fully before starting the next one. The phases are ordered by dependency — later tasks assume earlier ones are correct.

**Do not add things the task didn't ask for.** If you think something is missing, note it in the summary. Do not implement it.

**Do not modify files outside the task's scope.** If a task says "create `blueprint.service.ts`", do not also refactor `app.ts` while you're in there.

**If something is blocked**, stop and describe exactly what's missing or unclear. Do not guess and proceed.

---

## Phase Goals (what "done" means per phase)

| Phase | Done when... |
|---|---|
| 1 — Scaffold | All three terminals start without errors, shared types and frequency math exist |
| 2 — Database + Auth | A user can register, log in, and receive a JWT. All five tables exist in Postgres. |
| 3 — Blueprint API | Every Blueprint endpoint works and can be tested via `test-blueprints.sh` |
| 4 — Frontend Foundation | A user can log in and see a blank authenticated dashboard |
| 5 — Blueprint Creation | A user can build a zero-based budget in the browser, reach $0 remaining, and save it |
| 6 — Saved View + Editing | A user can view and inline-edit a saved Blueprint |
| 7 — Polish | All tests pass, error states handled, auth refresh works |

Do not declare a phase done until its goal is fully met — not just its final task.
