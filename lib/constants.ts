import type { ProjectState, TaskSection } from "./types"

export const PROJECT_STATES: ProjectState[] = ["Backlog", "In Build", "Live", "Paused"]

export const TASK_SECTIONS: TaskSection[] = ["Product", "Marketing"]

export const PROJECT_STATE_CONFIG: Record<
  ProjectState,
  { color: string; bg: string; border: string }
> = {
  Backlog: {
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
  "In Build": {
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  Live: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  Paused: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
}

export const SECTION_CONFIG: Record<TaskSection, { color: string; bg: string }> = {
  Product: { color: "text-primary", bg: "bg-primary/10" },
  Marketing: { color: "text-rose-400", bg: "bg-rose-400/10" },
}

export const TASK_COLUMN_LABELS: Record<string, string> = {
  todo: "To-Do",
  "in-progress": "In Progress",
  done: "Done",
}

// Source of truth for valid column ids. The board, the agent API, and the
// CLI all key off this list — drift between them was the cause of "I moved
// the task to `doing` but it never showed up" bugs, since `doing` is not a
// real column.
export const TASK_COLUMN_IDS = Object.keys(TASK_COLUMN_LABELS)

export function isValidTaskColumnId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TASK_COLUMN_LABELS, id)
}

export function taskColumnLabel(id: string | null | undefined): string {
  if (!id) return ""
  return TASK_COLUMN_LABELS[id] ?? id
}
