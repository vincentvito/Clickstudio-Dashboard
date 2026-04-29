# Changelog

## 2026-04-29

### Login/dashboard bootstrap
- After email-code login, the client now waits for a fresh Better Auth session, refreshes App Router state, and replaces the route instead of pushing immediately. The dashboard organization bootstrap also exits loading reliably if active-org setup fails or the user has no organizations, preventing the post-login skeleton from hanging until a manual refresh.

### Performance pass (Vercel React best practices)
- **`IdeaCaptureDialog` is now lazy-loaded** via `next/dynamic` from `IdeaFloatingButton`. The MediaRecorder + audio-blob plumbing no longer ships in the dashboard's initial JS — the chunk is fetched on first click, with a `pointerEnter`/`focus` preload so the open feels instant.
- **`TaskEditDialog` is now lazy-loaded** via `next/dynamic` from `KanbanBoard`. Tiptap (StarterKit + Mention + Suggestion) only downloads when a user opens an edit dialog. A `hasEverEdited` flag keeps the dialog mounted across closes so internal state survives, while still skipping the import on kanban views that never edit.
- **Service worker registration deferred to `requestIdleCallback`** (with a 1.5s `setTimeout` fallback for Safari) in `PwaInstall`. Hydration runs first; the SW registers when the main thread is idle. Split the over-loaded effect into two — SW registration and platform detection — so the early-return cleanup path doesn't skip the install-prompt listeners.

### View transitions (React 19 `<ViewTransition>`)
- Enabled `experimental.viewTransition` in `next.config.ts` so `<Link>` navigations are wrapped in `document.startViewTransition`.
- Added the full CSS recipe set to `globals.css`: timing variables (`--duration-exit/enter/move`), keyframes (`vt-fade`, `vt-slide`, `vt-slide-y`, `vt-via-blur`), classes for `fade-in/out`, `slide-up/down`, `nav-forward/back`, `morph`, persistent-element isolation, plus a `prefers-reduced-motion` reset.
- **Persistent elements**: sidebar (via `[data-slot="sidebar"]` selector), the dashboard header (uses backdrop-filter, gets the `display:none` old-snapshot workaround), the floating Idea button, and the PWA banner all set `view-transition-name` and skip animation so they don't slide with the page underneath them.
- **Directional page transitions**: dashboard ↔ project detail navigations slide horizontally. Each page wraps its content in a type-keyed `<ViewTransition>` (`nav-forward` / `nav-back` / `default: "none"`). Project cards on the dashboard tag forward intent via `<Link onNavigate={() => addTransitionType("nav-forward")}>`; the breadcrumb and not-found buttons on the detail page tag `nav-back`. Programmatic navigation after delete also calls `addTransitionType("nav-back")` inside `startTransition`.
- **List identity**: project cards on the dashboard, idea cards on `/dashboard/ideas`, and idea chips on the dashboard strip are each wrapped in `<ViewTransition key={id}>` so deletes/promotes/captures animate as enter/exit instead of jumping.
- **Idea bucket interactions**: `IdeaCard` mutations (`promoteIdea`, `deleteIdea`) now run inside `useTransition` so the SWR cache update fires within a Transition — the disappearing card fades while the project list smoothly absorbs the new item.

### PWA install banner + manifest
- `app/manifest.ts` exposes `Click Studio Control Center` as an installable web app: `start_url: /dashboard`, `display: standalone`, theme/background `#0a0a0a`, references the existing `favicon.svg` plus the dynamic `/apple-icon` route.
- `app/apple-icon.tsx` renders a 180×180 PNG via `ImageResponse` from the same brand-mark SVG (no static asset to maintain).
- `public/sw.js` is a minimal service worker (skip-waiting + clients-claim + no-op fetch listener) so Chromium-based browsers consider the app installable. No caching or push handlers yet — easy to add later.
- New `<PwaInstall />` client component (mounted in `app/layout.tsx`) registers `/sw.js`, listens for `beforeinstallprompt` to surface a custom install banner, falls back to an iOS Share-button hint on Safari, hides itself in standalone mode, and remembers a 7-day dismissal in `localStorage`.
- `app/layout.tsx` adds `applicationName`, `appleWebApp` metadata, and a `viewport.themeColor` that adapts to light/dark.
- `next.config.ts` serves `/sw.js` with `Content-Type: application/javascript`, `Cache-Control: no-cache, no-store, must-revalidate`, and `Service-Worker-Allowed: /` per the official Next.js PWA guide.

### Project state `Idea` → `Backlog` (consolidation)
- The `Idea` value in the `ProjectState` enum is renamed to `Backlog`. Filter ribbon, status badges, project form default, and stats labels follow. The Idea **bucket** (separate `Idea` table) now owns "haven't decided yet" thoughts; project state `Backlog` means "decided to do it, not started." This removes the duplicated affordance where the filter button "Idea" looked like it should match the bucket but didn't.
- DB migration `20260429140000_rename_project_state_idea_to_backlog` runs `ALTER TYPE "ProjectState" RENAME VALUE 'Idea' TO 'Backlog'` (Postgres propagates the rename to every column using the type, so `project.state`, `project_state_transition.fromState`, and `project_state_transition.toState` migrate in place) and resets the `project.state` column default.
- Stats response key renamed: `avgTimeInIdeaMs` → `avgTimeInBacklogMs`. `ProjectStatsStrip` labels: "Avg idea → live" → "Avg backlog → live", "Avg time in idea" → "Avg time in backlog".
- `POST /api/ideas/[id]/promote` now creates the new project in `Backlog` state.

### Idea bucket (UI)
- Dashboard idea chips now use a plain yellow source icon instead of a filled yellow icon tag, while the "Idea bucket" label icon is muted so the idea title keeps visual priority.
- Persistent yellow **Idea** floating button (lightbulb, pill shape, bottom-right) lives in the dashboard layout, reachable from any dashboard route. Animated yellow glow underlay (blurred pulse), hover tilts the bulb.
- New `/dashboard/ideas` page (with sidebar entry under "All projects") shows the full grid of pending ideas with `IdeaCard`s — title, description, link chips, source pill (Voice/Text), **Start project**, delete.
- Dashboard surfaces a compact horizontal `ScrollArea` strip of title-only chips (with a "View all" link to the page) — preserves vertical room for the project list. Strip hides when the bucket is empty.
- `IdeaCaptureDialog` opens via the floating button. Two tabs: **Type** (textarea, ⌘/Ctrl+Enter to submit, hint that links inline are extracted automatically) and **Record** (red mic button with multi-ring expanding-wave `animate-ping` overlay during recording and a slow idle pulse, 3-min auto-stop, re-record affordance, native `<audio>` playback of the captured clip before submit, mic-permission error surfacing). Audio captured at the browser's preferred Opus mime (webm/ogg), posted as inline base64 to `/api/ideas`. Submit label is **Store idea**.
- New SWR helpers in `lib/store.tsx`: `useIdeas`, `createIdeaFromText`, `createIdeaFromAudio`, `deleteIdea`, `promoteIdea` — all with toast feedback. Promoting an idea revalidates both `/api/ideas` and `/api/projects` so the new project appears immediately.

### Idea bucket (backend)
- New `Idea` model captures rough thoughts before they become projects. Fields mirror Project (`title`, `description`, `links`) plus `rawTranscript`, `source` (`Text` | `Voice`), and `status` (`Pending` | `Promoted` | `Archived`). One-to-one `promotedToProjectId` FK preserves the trail when an idea graduates.
- DB migration `20260429120000_add_idea_bucket` creates the `idea` table, `IdeaSource` and `IdeaStatus` enums, and indexes on `(organizationId, status)` and `userId`.
- New `lib/ai/gemini.ts` wraps `@google/generative-ai` (reusing the QR-Menu pattern with `gemini-3.1-flash-lite-preview`). `extractIdea(input)` accepts either typed text or an inline-base64 audio blob and returns `{ title, description, links[], rawTranscript }`. Audio is parsed natively — Gemini transcribes and structures in a single call so emphasis/pauses inform the extraction.
- `POST /api/ideas` accepts `{ kind: "text", text }` or `{ kind: "audio", audioBase64, mimeType }`, runs extraction, and creates a `Pending` idea. `GET /api/ideas` lists ideas for the active org. `DELETE /api/ideas/[ideaId]` removes one. `POST /api/ideas/[ideaId]/promote` creates a Project (state `Idea`) from the idea inside a `prisma.$transaction`, writes the initial `ProjectStateTransition`, marks the idea `Promoted`, and links the FK.
- Requires `GOOGLE_GENERATIVE_AI_API_KEY` in `.env`.

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
