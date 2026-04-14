export interface ChangelogChange {
  type: "added" | "changed" | "fixed" | "removed"
  items: string[]
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  changes: ChangelogChange[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.4.0",
    date: "2026-04-14",
    title: "Notifications, Mentions & Agents",
    changes: [
      {
        type: "added",
        items: [
          "Notification system with blinking bell icon in header",
          "Notifications created when you're assigned to tasks or mentioned in notes",
          "Deep-linking — clicking a notification opens the exact task or note",
          "@mentions in notes with autocomplete dropdown (Tiptap-powered editor)",
          "Rich-text foundation for notes (Tiptap) with styled mention chips",
          "Agents section with Genesis, Pitch, Forge, and Signal placeholders",
          "Optimistic drag-and-drop — cards move instantly without waiting for the server",
        ],
      },
      {
        type: "changed",
        items: [
          "Dark mode is now the always-on default (OS preference detection removed)",
          "System font stack instead of Geist for faster initial load",
          'Admin page moved to bottom of sidebar (was in user dropdown as "Settings")',
          "Tiptap editor lazy-loaded to keep initial bundle lean",
        ],
      },
      {
        type: "fixed",
        items: [
          "Avatar fallbacks now show email when user has no name set",
          "Deep-link effects no longer re-fire on every cache update",
          "Optimized dashboard sort from O(n²) to O(n) for projects with many logs",
        ],
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-04-13",
    title: "Organizations & Roles",
    changes: [
      {
        type: "added",
        items: [
          "Organizations with owner, admin, and member roles",
          "Invite members by email with branded HTML invitation emails",
          "Admin page for member management (invite, change roles, remove)",
          "Role-based permissions (only owners and admins can create/delete projects)",
          "User profile editing — add or update your display name",
          "Invite accept flow with auto-join on sign-in",
        ],
      },
      {
        type: "changed",
        items: [
          "OTP email template redesigned with dark branded style",
          "Projects now belong to organizations, scoped automatically",
          "Task counts shown as badges in sidebar next to each project",
        ],
      },
      {
        type: "fixed",
        items: [
          "Authorization bypass in project permission checks",
          "IDOR vulnerability where tasks could be assigned to users from other orgs",
          "Open redirect in login callbackUrl parameter",
          "HTML injection in invitation email templates",
        ],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-13",
    title: "Notes, Tools & Authentication",
    changes: [
      {
        type: "added",
        items: [
          "Notes tab per project with auto-save and in-place editing",
          "Tools page with domain availability search (RDAP-powered)",
          "Email OTP authentication (6-digit codes via ZeptoMail)",
          "Multi-assignee support for tasks with stacked avatars",
          "Project detail deep-linking via URL params",
          "Toast notifications for all mutations (Sonner)",
          "Skeleton loading states throughout the dashboard",
          "Changelog page with version history",
        ],
      },
      {
        type: "changed",
        items: [
          "localStorage migrated to PostgreSQL API routes",
          "SWR-powered data fetching with automatic deduplication and revalidation",
          "Tabs switched to shadcn line variant for cleaner underline style",
          "Confirmation dialogs using AlertDialog instead of native confirm()",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-04-12",
    title: "Initial Release",
    changes: [
      {
        type: "added",
        items: [
          "Project management with states (Idea, In Build, Live, Paused)",
          "Kanban board with drag-and-drop (To-Do, In Progress, Done)",
          "Task sections for Product and Marketing",
          "Daily log with timestamped entries",
          "Better Auth foundation with Google OAuth",
          "PostgreSQL database with Prisma ORM",
          "Responsive sidebar with collapsible navigation",
          "Landing page with hero section",
        ],
      },
    ],
  },
]

export const APP_VERSION = changelog[0].version

export function getLatestVersion(): string {
  return changelog[0].version
}

export function getChangelogByVersion(version: string): ChangelogEntry | undefined {
  return changelog.find((entry) => entry.version === version)
}
