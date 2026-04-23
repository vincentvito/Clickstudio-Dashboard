# Changelog

## 2026-04-23

### Task-level transitions + per-project timeline UI
- New `TaskTransition` model captures every kanban column move per task (`fromColumnId → toColumnId`) with a nullable `fromColumnId` (marks task creation) and nullable `userId`.
- DB migration `20260423083619_add_task_transitions` creates the table plus a one-row-per-existing-task backfill (keyed to `task.createdAt`, `userId` left NULL since tasks have no creator field).
- `POST /api/projects/[projectId]/tasks` and `PATCH /api/tasks/[taskId]` now write `TaskTransition` rows inside a `prisma.$transaction` — creation emits a `null → initialColumnId` row; column changes emit a `from → to` row only when the column actually differs.
- New `GET /api/projects/[projectId]/timeline` merges project state transitions and task column transitions, sorted by time desc.
- New "Timeline" tab on the project detail page (`ProjectTimeline` component). Shows interleaved project state changes and task column moves with relative timestamps, actor attribution, and a computed "time in previous state" annotation (e.g., "Moved from Idea to In Build · 3d in Idea") so duration information is visible at the point of change.
- `TASK_COLUMN_LABELS` constant added to `lib/constants.ts` so display labels ("To-Do", "In Progress", "Done") stay consistent with the kanban.

### Project state transition tracking
- New `ProjectStateTransition` model captures every move through `Idea → In Build → Live → Paused`, with nullable `fromState` (marks project creation), `toState`, `at`, and nullable `userId` (for future agent-initiated transitions and the migration backfill).
- DB migration `20260423082013_add_project_state_transitions` creates the table plus a one-row-per-existing-project backfill so duration queries work against current data.
- `POST /api/projects` and `PATCH /api/projects/[projectId]` now write transitions inside a `prisma.$transaction` — creation emits a `null → initialState` row; state changes emit a `fromState → toState` row only when the state actually differs.
- New `GET /api/projects/stats` aggregates per-project and org-wide durations (`timeInIdea`, `timeInBuild`, `timeToLive`).
- New `ProjectStatsStrip` component on the dashboard surfaces `Avg idea → live`, `Avg time in idea`, and `Live projects` above the filter row. `formatDuration` helper added to `lib/format.ts`.

### Infrastructure
- Added `scripts/backup-db.sh` — data-only `pg_dump` of the Prisma schema, auto-detects the schema name from `DIRECT_URL`, strips Prisma-specific query params for libpq compatibility, excludes `_prisma_migrations`. Restore flow: `prisma migrate deploy` + `psql < dump.sql`. `/backups` added to `.gitignore`.

## 2026-04-21

### @mentions on tasks and daily logs
- Added `description` field to `Task` (rich text via Tiptap) with @mentions autocomplete in the edit dialog.
- Task cards on the kanban now show a 2-line description preview with mentions rendered as badges.
- Daily log input now supports @mentions via a lightweight `MentionInput` (plain input + popover autocomplete, no full rich-text editor to keep the one-line feel).
- Server-side: task POST/PATCH and log POST parse mentions and emit notifications — new `task_mention` and `log_mention` notification types. Users who are both newly assigned and mentioned in the same action only get the assignment notification (no double-notify).
- DB migration `20260421120000_task_description_and_mention_types` adds `task.description TEXT NOT NULL DEFAULT ''`.
