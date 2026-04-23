"use client"

import { useMemo } from "react"
import { useProjectTimeline, type TimelineEntry } from "@/lib/store"
import { relativeTime, formatDuration } from "@/lib/format"
import { taskColumnLabel, PROJECT_STATE_CONFIG } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProjectState } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProjectTimelineProps {
  projectId: string
  active: boolean
}

export function ProjectTimeline({ projectId, active }: ProjectTimelineProps) {
  const { entries, isLoading } = useProjectTimeline(projectId, active)

  // For each entry, compute "time in previous state" relative to the next
  // older entry sharing the same scope (project state thread, or same task).
  // Entries arrive sorted newest-first; walking oldest-first lets us remember
  // the most recent timestamp per scope in a single pass.
  const durations = useMemo(() => {
    const map = new Map<string, number>()
    const lastByScope = new Map<string, number>()
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i]
      const scope = e.kind === "project_state" ? "project" : `task:${e.taskId}`
      const at = new Date(e.at).getTime()
      const prevAt = lastByScope.get(scope)
      if (prevAt !== undefined) {
        map.set(e.id, at - prevAt)
      }
      lastByScope.set(scope, at)
    }
    return map
  }, [entries])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground py-20 text-center text-sm">
        No activity yet
      </p>
    )
  }

  return (
    <ol className="border-border/40 relative ml-1 space-y-4 border-l pl-6">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <Marker entry={e} />
          <TimelineRow entry={e} durationMs={durations.get(e.id) ?? null} />
        </li>
      ))}
    </ol>
  )
}

function Marker({ entry }: { entry: TimelineEntry }) {
  // Dot color: project state uses the target state's color; tasks use a
  // muted accent for column moves, with a stronger tint for "done".
  let color = "bg-border"
  if (entry.kind === "project_state") {
    const config = PROJECT_STATE_CONFIG[entry.toState as ProjectState]
    if (config) color = config.bg.replace("/10", "/60")
  } else if (entry.kind === "task_column") {
    if (entry.toColumnId === "done") color = "bg-emerald-400/60"
    else if (entry.toColumnId === "in-progress") color = "bg-blue-400/60"
    else color = "bg-muted-foreground/40"
  }

  return (
    <span
      className={cn(
        "ring-background absolute top-[7px] -left-[27px] block size-2 rounded-full ring-4",
        color,
      )}
    />
  )
}

function TimelineRow({
  entry,
  durationMs,
}: {
  entry: TimelineEntry
  durationMs: number | null
}) {
  const actorName = entry.user?.name || entry.user?.email || "System"

  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-[13px] leading-snug">
          <EntryText entry={entry} />
          {durationMs !== null && (
            <span className="text-muted-foreground/70 ml-2 text-xs tabular-nums">
              · {formatDuration(durationMs)} {scopeLabel(entry)}
            </span>
          )}
        </p>
        <p className="text-muted-foreground/70 mt-0.5 text-[11px]">
          {actorName}
        </p>
      </div>
      <span className="text-muted-foreground/50 shrink-0 text-[11px] tabular-nums">
        {relativeTime(entry.at)}
      </span>
    </div>
  )
}

function EntryText({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === "project_state") {
    if (entry.fromState === null) {
      return (
        <>
          Project entered <Tag>{entry.toState}</Tag>
        </>
      )
    }
    return (
      <>
        Moved from <Tag>{entry.fromState}</Tag> to <Tag>{entry.toState}</Tag>
      </>
    )
  }

  // task_column
  if (entry.fromColumnId === null) {
    return (
      <>
        Created task <Quote>{entry.taskTitle}</Quote> in{" "}
        <Tag>{taskColumnLabel(entry.toColumnId)}</Tag>
      </>
    )
  }
  return (
    <>
      Moved <Quote>{entry.taskTitle}</Quote> from{" "}
      <Tag>{taskColumnLabel(entry.fromColumnId)}</Tag> to{" "}
      <Tag>{taskColumnLabel(entry.toColumnId)}</Tag>
    </>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-foreground font-medium">
      &ldquo;{children}&rdquo;
    </span>
  )
}

function scopeLabel(entry: TimelineEntry): string {
  if (entry.kind === "project_state") {
    return entry.fromState ? `in ${entry.fromState}` : ""
  }
  return entry.fromColumnId
    ? `in ${taskColumnLabel(entry.fromColumnId)}`
    : ""
}
