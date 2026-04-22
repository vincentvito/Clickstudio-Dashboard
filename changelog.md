# Changelog

## 2026-04-21

### @mentions on tasks and daily logs
- Added `description` field to `Task` (rich text via Tiptap) with @mentions autocomplete in the edit dialog.
- Task cards on the kanban now show a 2-line description preview with mentions rendered as badges.
- Daily log input now supports @mentions via a lightweight `MentionInput` (plain input + popover autocomplete, no full rich-text editor to keep the one-line feel).
- Server-side: task POST/PATCH and log POST parse mentions and emit notifications — new `task_mention` and `log_mention` notification types. Users who are both newly assigned and mentioned in the same action only get the assignment notification (no double-notify).
- DB migration `20260421120000_task_description_and_mention_types` adds `task.description TEXT NOT NULL DEFAULT ''`.
