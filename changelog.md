# Changelog

## 2026-05-02

### Agent tokens — bearer auth for AI agents and CLIs
- New `AgentToken` Prisma model + migration `20260502120000_add_agent_tokens`. Tokens are stored as `sha256` hashes (full token shown once at creation). Each token carries `scopes: String[]`, optional `projectIds: String[]` to constrain access, plus `expiresAt`/`revokedAt`/`lastUsedAt` for lifecycle tracking. Token format is `ccs_<base64url(32 bytes)>`; UI shows only the 12-char prefix after creation.
- Added `User.isAgent Boolean` so the dashboard can render synthetic agents distinctly (🤖 prefix). Each `AgentToken` owns a synthetic `User` (`agentUserId`) — every action that token takes is attributed to that agent user, so historical task assignments, transitions, and authorship survive even after the token is revoked. Synthetic users get a `agent-{uuid}@agents.clickstudio.local` email and `emailVerified: true` to bypass auth flows.
- New `lib/agent-auth.ts` with `requireAgent(req, scope)` middleware: parses `Authorization: Bearer ccs_...`, hashes for lookup, rejects revoked/expired tokens, fires a fire-and-forget `lastUsedAt` update, and exposes `hasScope` / `canAccessProject` helpers. Coarse scope set: `org:read`, `projects:read`, `projects:write`, `tasks:read`, `tasks:write`, `logs:write`. No third-party HTTP or crypto deps — uses Node's `crypto` only.
- Token CRUD: `GET/POST /api/agent-tokens` and `DELETE /api/agent-tokens/[tokenId]` (session auth, owner/admin only). Revoke is soft (sets `revokedAt`) so audit attribution sticks. Token-side bearer endpoints land under `/api/agent/*` to keep the cookie/bearer auth lanes separate; first endpoint is `GET /api/agent/whoami` (no scope required).
- New settings page `/dashboard/admin/agent-tokens`: list active/revoked tokens with prefix, scopes, last-used relative time, and creator. Create dialog with toggle-chip scope picker. One-time reveal modal with copy-to-clipboard and a sample `export CLICKSTUDIO_AGENT_TOKEN=...` snippet for the upcoming `ccctl` CLI. Revoke uses the shared confirm dialog. Linked from the Admin page header via a "Agent tokens" button.

### Mention recipients: project-aware + active-only
- `resolveMentionRecipients(orgId, ids, { projectId })` now takes an optional `projectId`. When set, agent recipients are filtered to tokens whose `projectIds` is empty (org-wide) or contains that project — so a project-scoped token can no longer receive mentions/assignments from projects outside its scope. Threaded through every fanout site: notes (POST + PATCH), logs (POST), tasks (POST + PATCH, both session and agent variants), task assignee re-validation. The `/api/agent/notifications` endpoint stays identity-bound and unscoped — the policy is enforced at write time, so out-of-scope notifications never get created in the first place. This also keeps any pre-existing notification rows readable as audit trail.
- Both `resolveMentionRecipients` and `/api/org/members/list` now require `(expiresAt IS NULL OR expiresAt > now)` on agent tokens, mirroring the check in `resolveAgentContext`. Expired agents stop being assignable in the UI and stop receiving notifications the moment their token expires, instead of silently lingering until revoked.
- `/api/org/members/list` accepts `?projectId=` and applies the same agent `projectIds` allow-list before returning synthetic agents. Project-scoped pickers (kanban create/edit, log mention input, note/task Tiptap mentions) now pass the current project id, so out-of-scope agents are hidden before the user can select them instead of being silently dropped at save time. Global callers such as the sidebar still use the unfiltered org list for role checks.

### Mentions for agents (humans can @-mention agents, agents poll for them)
- New `lib/mention-recipients.ts` exposes `resolveMentionRecipients(orgId, candidateUserIds)` returning the subset that are either Member rows of the org or active (non-revoked) agent users. Every notification fanout site now routes through it: project-scoped tasks/notes/logs (POST + PATCH) and the agent-side tasks/logs (POST + PATCH). Previously the filter was `prisma.member.findMany`, which silently dropped agent recipients — meaning a human could `@`-mention 🤖 claude-local in a task and the agent would never see it. Same fix made the existing session-auth task PATCH preserve agent assignees on save (the dialog used to silently drop them whenever a human saved a title/description change).
- `/api/org/members/list` now also returns active agent users (with `role: "agent"`) so every assignee picker (kanban, task edit dialog, mention input, tiptap editor) treats agents as first-class assignable identities. The Admin team page is unaffected — it reads from better-auth's `organization.listMembers` directly.
- New bearer endpoints `GET /api/agent/notifications` (with `?unread=true` and `?limit=`) and `PATCH /api/agent/notifications` (`{ markAllRead: true }`) and `PATCH /api/agent/notifications/[id]`. These are identity-bound (they read/write `Notification` rows where `userId === ctx.agentUserId`) and don't take a scope, mirroring `whoami`. The CLI gets `ccctl mentions list [--unread]`, `ccctl mentions ack <id>`, and `ccctl mentions ack-all`.
- Hardening: `lib/user-display.ts` now uses the explicit codepoint escape `"\u{1F916} "` for the agent prefix instead of the literal robot emoji, so any toolchain step that mishandles UTF-8 (editor saving as cp1252, bundler reading as Latin-1) can't mangle the prefix into mojibake. Same escape used in agent-side notification messages.

### Agent token org-wide scope guard
- `app/api/agent-tokens/route.ts` POST rejects mints that combine a non-empty `projectIds` allow-list with any of the org-wide scopes (`org:read`, `ideas:read`, `ideas:write`). Without this guard, the UI's "scoped to specific projects" promise didn't hold for ideas — a project-scoped token granted `ideas:read` could enumerate every idea in the org including `promotedToProject.{id, title}` for projects outside the allow-list. New `ORG_WIDE_SCOPES` constant in `lib/agent-auth.ts` keeps the policy in one place; the settings UI tags those chips so when a project-picker UI lands later it can grey them out automatically.

### Agent ideas endpoints
- New scopes `ideas:read` / `ideas:write` and bearer endpoints `GET/POST /api/agent/ideas` (filter by `?status=` and `?limit=`) and `GET /api/agent/ideas/[ideaId]`. Agent-created ideas skip the Gemini extraction and the name-finder background job — the agent already passes structured `title`/`description`/`links`, so we don't pay the LLM/RDAP cost on every capture. The single-idea GET still surfaces existing `nameSuggestions` and `nameSearchStatus` if the idea was created via the dashboard. Settings UI scope chips now include both new scopes (and pre-select them on new tokens).

### Bearer endpoints + 🤖 UI treatment
- Bearer-token endpoints under `/api/agent/*`: `GET org`, `GET/POST projects`, `GET/PATCH projects/[id]`, `GET/POST tasks`, `GET/PATCH tasks/[id]`, `POST logs`. All scope-checked via `requireAgent(req, scope)`; project-scoped tokens (with `projectIds` set) cannot create new projects and cannot read/write outside their allow-list. `tasks` and `logs` endpoints accept friendly aliases (`status`/`columnId`, `text`/`message`, `project`/`projectId`) so the CLI can pass natural names. Project state changes and task column changes attribute their `ProjectStateTransition`/`TaskTransition` records to the agent's synthetic user, and tasks created by an agent are auto-assigned to that agent (override with `assignToSelf: false`).
- New `lib/user-display.ts` with `displayName(user)` / `plainName(user)` / `isAgentUser(user)`. Agent users render with a `🤖 ` prefix everywhere their name appears: kanban assignee chips and dropdowns, task edit dialog, project timeline (transition actor), notes author. `UserSummary` now carries an optional `isAgent` flag and every Prisma `select` that returns user data picks it up. `MentionItem` carries it too so future mention rendering can branch on agent status.

## 2026-04-29

### Idea name-finder agent
- Added AI SDK (`ai` + `@ai-sdk/google`) name-finder flow for saved ideas. After an idea is captured, the create route marks it `Running` and starts the name-finder with `after()`, so the idea appears immediately while the server keeps working even if the tab closes.
- New `NameFinderAgent` uses Gemini with a bounded `checkDomain` tool budget to find up to two available `.com` names. Domain checks now live in shared `lib/domain/check-domain.ts` and reuse RDAP with DNS fallback.
- New `IdeaNameSuggestion` model, `IdeaNameSearchStatus` enum, and migration `20260429193000_add_idea_name_suggestions` persist agent status, errors, and suggested domains per idea.
- Idea cards now show name-finder progress, available suggestions, retry on failure, and a `Use` action that updates the idea title without overwriting it automatically. `/api/ideas` conditionally polls while a name search is running so server-side `after()` results appear without client-driven agent kickoff.
- Name-finder runs now race the agent against a 55s timeout and mark the idea `Failed` on timeout. The client also treats `Running` searches older than 120s as stalled, stops polling, and shows a retry affordance for crash/teardown cases where no server cleanup ran.
- Name-finder progress now records the checked domain count and latest domain (`20260430002500_add_idea_name_search_progress`), so cards can show what the agent is checking. If Gemini's tool loop verifies domains but fails to produce a final structured answer, the runner falls back to the verified available domains instead of surfacing a generic "No output generated" error.
- AI SDK `No output generated` errors after a completed domain-check pass now resolve as "No available .com names found yet" when no verified domains are available, keeping internal model-loop failures out of the idea card UI.
- Idea deletion now uses the shared confirmation dialog before the destructive action runs. The client API helper also handles `204 No Content` responses so successful deletes no longer show a false JSON parse error.

### Login/dashboard bootstrap
- After email-code login, the client now waits for a fresh Better Auth session, refreshes App Router state, and replaces the route instead of pushing immediately. The dashboard organization bootstrap also exits loading reliably if active-org setup fails or the user has no organizations, preventing the post-login skeleton from hanging until a manual refresh.

### Web Push notifications (mentions + assignments)
- New `PushSubscription` Prisma model + migration `20260429180000_add_push_subscriptions` (`endpoint UNIQUE`, `userId` FK, `userAgent`, `(userId)` index). Cascades on user delete.
- `lib/push.ts` wraps `web-push` with `sendPushToUser(userId, payload)` — fans out to every subscribed device, prunes 404/410 endpoints automatically, lazy-configures VAPID, no-ops cleanly when keys aren't set so dev environments without VAPID still work.
- `lib/notifications.ts` now fires `sendPushToUser` for every notification it writes via `after()` from `next/server` — push runs after the response is sent, so it adds zero latency to the originating request and survives serverless/edge runtime cleanup. Per-type push titles map to "You were mentioned" / "Task assigned"; the link doubles as the OS notification `tag` so repeats to the same destination collapse instead of stacking.
- `POST /api/push/subscribe` upserts a subscription for the current user keyed by endpoint (so re-subscribing on the same device replaces the old row). `POST /api/push/unsubscribe` removes one.
- `public/sw.js` handles `push` (renders the OS notification with title/body/icon/tag from the payload) and `notificationclick` (closes the toast, focuses an existing app tab and navigates it to the link, or opens a new window).
- New `<PushToggle />` lives in the footer of the notifications bell dropdown. Detects support, asks for permission, subscribes via `pushManager.subscribe` with the `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, posts the subscription to the API, and offers an off switch. Surfaces a "blocked in browser settings" hint if the user has previously denied.
- Requires `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env` (optional `VAPID_SUBJECT`, defaults to `mailto:vlad.palacio@gmail.com`). Generate via `web-push generate-vapid-keys`.

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
