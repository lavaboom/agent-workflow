<!-- Paste this block into the new project's AGENTS.md, near the top, and fill in every value.
     The shared rules (C:/code/agent-workflow/WORKFLOW.md, AGENT_PROTOCOL.md, TASKS.md, claude/) name these
     settings and never a command or a path. A value that does not apply is "(none)". -->

This project follows the shared workflow: read `C:/code/agent-workflow/WORKFLOW.md` first. It links the rest of
the shared rules; this file holds the project's own rules and the settings below.

## Workflow settings

| Setting | Value |
|---|---|
| Project | <the project's name> |
| Main checkout | `C:\code\<project>` |
| Worktrees | `../<project>-worktrees/task-NNN-<slug>/` |
| Prepare a worktree | <what a new worktree needs, e.g. copy the env files from the main checkout; the dependency install> |
| Branch database (a task with a migration) | <the command that starts a throwaway database, and the one that cleans it up; or (none)> |
| Gate | <the command that runs every check before a merge> |
| Merge | <the command that merges one or more branches into local master through the gate> |
| Gate log | <the command that prints recent gate runs and flake suspects> |
| Capacity | <the command that answers dispatch / dispatch-without-stack / wait> |
| Builder checks | <the commands a builder runs before reporting> |
| Check before a docs commit | <a command, or (none)> |
| Hard areas (`opus-xhigh`) | <for example money math, RLS or migration design> |
| Rules every builder prompt names | <the section names in this AGENTS.md that every builder prompt quotes> |
| Docs a builder reads for a task | the task folder<; the design docs it touches> |
| The product's user, in a brief | <a user, a customer, a parent…> |
| Local services | `docs/local-services.md` |
| Paid services | <the spending cap; the amount under which a run needs no yes; the ledger, for example `docs/external-spend.md`> |
| Who pushes | <only the owner; or who else pushes what, and when> |
| Workflow overrides | (none) |
