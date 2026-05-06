# ccctl improvements — consolidated work plan

Source: feedback from Rolino + dogfooding session on 2026-05-06. The CLI works,
but agents hit friction when they have to memorise IDs, can't preview writes,
and silently fail to assign work because `@handle` in a plain description does
not actually set assignees.

## Findings from live data

Verified by running `ccctl` against `https://cc.clickstudio.ai` with a temporary
org-wide token.

1. **Assignment via `@mention` in description doesn't set assignees.** Tasks
   created by agents (e.g. `cmou4toj5`, `cmou4top3`, `cmou4tox3`) start their
   description with `@vlad` and have `assignees: []`. Compare to
   `cmoog7nwi` which uses tiptap-style `@[Matteo](userId)` — same problem,
   assignees still empty. Mention markup ≠ assignment, agents conflate them.
2. **`User.name` is sometimes empty.** Matteo's `User.name = ""`. We cannot
   resolve `@matteo` by name alone — must fall back to email local-part.
3. **`/api/org/members/list` rejects bearer tokens.** It is session-only.
   Bearer-authed callers (the CLI) have no way to enumerate members today.
   Alias resolution requires a new agent endpoint.
4. **Mention syntax in descriptions is inconsistent.** Plain `@vlad`,
   tiptap markup `@[Matteo](id)`, and bare email all show up in the wild. Only
   the tiptap form parses on the dashboard.

## Work items

Items grouped by area, with rough effort tags: `S` ≤ ½ day, `M` ½–1 day,
`L` 1–2 days. Effort assumes one focused pass with no surprises.

### A. Assignee support — primary ask from Rolino

- [x] **A1 [M] — Backend audit + fix: agent task routes honour `assigneeIds`.**
  Confirm `POST /api/agent/tasks` and `PATCH /api/agent/tasks/[taskId]`
  actually accept `assigneeIds: string[]` and that the IDs are validated as
  members of the same org (no cross-org assignment, no arbitrary userId
  acceptance). If they currently drop the field silently, fix.
- [x] **A2 [S] — Backend: new `GET /api/agent/members`.** Bearer-authed mirror of
  `/api/org/members/list`. Returns members + active (non-revoked,
  non-expired) agents. Required scope: `org:read`. Excludes private fields.
- [x] **A3 [S] — CLI: `tasks create --assignee @handle` / `--assignee-id <id>`.**
  Repeatable flags. Resolves `@handle` via `/api/agent/members`.
  Implicit: if any `--assignee` flag is given, do not auto-add self
  (current `--no-assign-self` becomes redundant; keep as a no-op alias for
  one release).
- [x] **A4 [S] — CLI: `tasks update --assignee` (replace) /
  `--add-assignee` / `--remove-assignee` (mutate).** Mirrors
  `gh pr edit --add-reviewer`/`--remove-reviewer` semantics.
- [x] **A5 [S] — CLI: alias resolver.** Resolution order:
  1. Exact `id` match (full userId).
  2. Case-insensitive exact `name`.
  3. Email local-part, including dot/dash/underscore-split chunks
     (`vlad.palacio@…` → matches `vlad`, `palacio`, `vlad.palacio`).
  4. Case-insensitive unique prefix on `name` ≥ 3 chars.
  5. Fail with candidate list. **Never** silently pick.
  Cache the members response for the lifetime of one CLI invocation.
- [x] **A6 [decided: warn, do not auto-promote] — `@handle` in description.**
  Decision: keep `--assignee` canonical and warn when a write contains plain
  `@word` patterns without `--assignee`. Implemented as a CLI-side check via
  `findPlainHandles` + `notice` field; the regex skips emails (`a@b.com`)
  and tiptap markup (`@[Name](id)`). No backend change.

### B. Discovery without memorised IDs

- [x] **B1 [M] — `projects get <title-or-id>` and similar.** Resolution order:
  1. Exact `id` (cuid format detected).
  2. Case-insensitive exact `title`.
  3. Case-insensitive contains-match if unambiguous.
  4. Fail with candidate list.
  Affected commands: `projects get`, `projects update`,
  `tasks list --project`, `tasks create --project`,
  `logs create --project`. The `--project` flag should accept either ID
  or title.
- [x] **B2 [S] — `tasks get <title-or-id> [--project <p>]`.** Same idea, but
  scoped by project to avoid global title collisions.

### C. Filtering

- [x] **C1 [S] — `tasks list --status <todo|doing|done|...>`.** Column ID match.
  Document the canonical column IDs.
- [x] **C2 [S] — `tasks list --assignee @handle`.** Reuses A5 resolver.
- [x] **C3 [S] — `tasks list --section <name>`.** Case-insensitive exact.
- All three should be combinable. Server-side filtering preferred; if not
  available, document the fallback as client-side.

### D. Output schema stability

- [x] **D1 [S] — Document the JSON envelope.** Add a section to the README
  stating: `{ ok: bool, data: T, summary?: string, breadcrumbs?: [], notice?: string }`.
  Pin the shape of `data` per command in a generated reference.
- [x] **D2 [S] — Add `schemaVersion: "1"` to the envelope.** Cheap insurance
  for future breaking changes — agents can branch on it. Do this before
  the CLI is widely deployed.

### E. Safer writes

- [x] **E1 [S] — Global `--dry-run`.** When set, the CLI prints the resolved
  HTTP method + URL + JSON body it *would* send and exits 0 without
  contacting the API. Implement at the client layer so every write
  command gets it for free.
- [x] **E2 [S] — `tasks update --append-description "..."`,
  `--prepend-description "..."`.** Fetch current description, concatenate
  with a separator (`\n\n`), PATCH. Document the fetch-then-write nature
  (race window is small but real).
- [x] **E3 [S] — Strict mode for unknown flags.** Verified: commander
  rejects unknown options out of the box, prints "Did you mean …?", and
  exits non-zero. Tested `--asignee` and root-level `--bogus` — both
  exit 1 with a helpful message. No code change required.

### F. Better error reporting

- [x] **F1 [S] — Surface dropped fields.** Implemented via shared
  `lib/agent-fields.ts` helper applied to every agent write route (tasks,
  projects, logs, ideas, favorite). Unknown body keys come back as
  `warnings: string[]` on the response. CLI's `client.request()` strips
  them off the typed object and pushes into a per-invocation notice queue
  drained by the writer.
- [x] **F2 [S] — Validation errors should name the field.** All agent
  write routes now use `fieldError(field, message, hint?)`. CLI surfaces
  the field name in the rendered hint (`field: title — title is required`).

### G. Notes — full CRUD on the bearer surface (Batch 5, post-Rolino feedback)

- [x] **G1 [M] — Backend agent note routes.** New
  `/api/agent/notes` (GET list, POST create) and `/api/agent/notes/[noteId]`
  (GET, PATCH, DELETE), mirroring the session-auth shape. Mention
  notifications fan out via `resolveMentionRecipients`. F1+F2 hardened.
- [x] **G2 [S] — New scopes.** `notes:read` and `notes:write` added to
  `AgentScope` / `ALL_SCOPES`, marked project-scoped. Existing tokens
  must be re-minted to gain access.
- [x] **G3 [S] — Token mint UI.** Two new scope checkboxes, included in
  the default-selected set so new tokens get notes access by default.
- [x] **G4 [M] — CLI `notes` command group.** `list`, `get`, `create`,
  `update`, `delete` (with `rm` alias), all accepting `<ref>` as ID or
  title scoped by `--project`. Reuses the same project resolver as other
  commands.

## Suggested order

Ship in batches so we can dogfood between rounds.

**Batch 1 — Assignees (resolves the immediate Rolino blocker):** A1, A2, A3,
A4, A5. ~1.5 days.

**Batch 2 — Discovery + filtering:** B1, B2, C1, C2, C3. ~1 day.

**Batch 3 — Safety + agent UX:** D1, D2, E1, E2, E3, F1, F2. ~1 day.

**Open question A6** (auto-promote `@handle`) blocks nothing but should be
decided before Batch 1 lands. Recommendation in the entry: prefer the
warning route, keep the explicit `--assignee` flag canonical.

## Acceptance checks for the whole effort

After all three batches:

- [x] `ccctl projects get "Clickstudio dashboard"` returns the project without
  needing the CUID.
- [x] `ccctl tasks create --project "Family Photoshoot AI" --title "Smoke test" --assignee @vlad --dry-run`
  prints the payload, exits 0, mutates nothing.
- [x] Same command without `--dry-run` creates the task and `ccctl tasks get
  <id>` shows Vlad in `assignees`.
- [x] `ccctl tasks list --project "Family Photoshoot AI" --status todo --assignee @vlad`
  filters correctly.
- [x] `ccctl tasks update <id> --append-description "Update: deployed."` does
  not clobber the existing description.
- [x] A bad alias (`--assignee @nope`) prints a candidate list and exits with
  exit code **1** (`usage_error`) — chosen over 4 (forbidden/scope) because
  the alias never reached the API; it's a user-input problem, not a
  permission problem. Same code as commander's "unknown option" errors.
