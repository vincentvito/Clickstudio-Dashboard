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
    version: "0.1.0",
    date: "2026-04-13",
    title: "Initial Release",
    changes: [
      {
        type: "added",
        items: [
          "Project management with states (Idea, In Build, Live, Paused)",
          "Kanban board with drag-and-drop (To-Do, In Progress, Done)",
          "Task sections for Product and Marketing",
          "Daily log with timestamped entries",
          "Authentication with Better Auth (email + Google OAuth)",
          "PostgreSQL database with Prisma ORM",
          "Dark/light mode with system preference detection",
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
