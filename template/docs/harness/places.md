# Places: checkouts, worktrees, the shared machine

<!--
source: v1 AGENT_PROTOCOL.md (places, worktrees, shared local services), trimmed
applies: every builder and reviewer, before the first command
review-by: 2027-01-31
-->

## The two places

- **Main checkout** (Workflow settings → Main checkout), on `master`: only docs commits for claims, closes
  and planning, and the project's merge command. Never write code here or commit anything else to master.
  Other agents' uncommitted work may sit here: commit only your own paths (`git commit -- <paths>`); never
  `git add -A`, `git add .` or `git commit -a`. **While a merge batch runs, nothing is committed on master**
  (owner, 2026-10-22): a claim or board commit moves master under the merge and breaks its fast-forward.
- **The task's worktree** (Workflow settings → Worktrees) on `task/task-NNN-<slug>`: everything else: code,
  tests, the specs and plans written while building, `status.md`.
- **The folder your session opened in doesn't count.** A desktop-app session stays in the folder it started
  in (the main checkout, or an app-made `.claude/worktrees/…`). After claiming, every edit and command uses
  the task worktree's full path, or the session's working folder is switched to it when the app offers that.
  Never work in an app-made `.claude/worktrees/` folder.

## Worktrees

- One task = one branch = one worktree. Never implement on master or in the main checkout.
- This overrides tool defaults: the Claude desktop app's and `superpowers:using-git-worktrees`'
  `.claude/worktrees/` and `.worktrees/`, and Codex's own worktree location.
- One exception stays where it is: the merge command's own worktree, when the project has one.
- Prepare a new worktree as the setting says (env files copied from the main checkout, the install step).
  A task that adds or changes a migration starts its own database there (Workflow settings → Branch
  database) and cleans it up at the close.

## The shared machine

Every agent on this machine uses the same local services, CPUs and dev test user. The project's own services,
test users and dev-server notes are in `docs/local-services.md`.

- **Never restart a shared local service** (the local-services doc names them and what counts as a restart)
  unless the owner says yes in this session: each restart breaks every other agent's run. If a service looks
  broken (refused connections, timeouts shared by every run), read the gate log (Workflow settings) for other
  runs that failed the same way, then report. Your own branch database is yours to reset and stop.
- **Browser checks that change data use a test user of your own**, never the shared dev user; the
  local-services doc says how to make and remove one. Reading pages as the shared user is fine.
- **Run the dev server from the task's worktree**, on a port of its own; a preview started from the session's
  folder serves that folder's code, usually master. Before calling a UI change verified, check the page shows
  your change.
  - *Claude desktop app:* `preview_start` runs only configurations from `.claude/launch.json` in the
    session's folder. Add a temporary configuration that runs the worktree's server on the task's port, start
    it, and `git checkout -- .claude/launch.json` right away (the server keeps running); `preview_stop` when
    done. Never commit the configuration.
  - *A terminal (Codex, the CLI):* run the dev server command from the local-services doc in the worktree,
    on the task's port.
- **Expect a busy machine.** While iterating, run only the integration files your change touches, at the
  default worker count. A test that times out under load is not flaky until the gate log says so. The gate
  waits for any other gate and gives up after a while: that is a queue, not a failure. A reviewer with
  several tasks in `REVIEW` merges them in one run of the merge command with every branch.
