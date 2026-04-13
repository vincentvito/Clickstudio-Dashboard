"use client"

import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "./status-badge"
import { relativeTime } from "@/lib/format"
import type { Project, Task, LogEntry } from "@/lib/types"

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  logs: LogEntry[]
}

export function ProjectCard({ project, tasks, logs }: ProjectCardProps) {
  const done = tasks.filter((t) => t.columnId === "done").length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : -1

  const lastLog = logs
    .filter((l) => l.projectId === project.id)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))[0]

  return (
    <Link
      href={`/dashboard/${project.id}`}
      className="group block rounded-lg border border-transparent p-4 transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-[13px] font-semibold text-foreground">
          {project.title}
        </h3>
        <StatusBadge state={project.state} />
      </div>

      {project.brainDump && (
        <p className="mb-2.5 line-clamp-1 text-xs text-muted-foreground">
          {project.brainDump}
        </p>
      )}

      {pct >= 0 ? (
        <div className="mb-2.5 flex items-center gap-2.5">
          <Progress value={pct} className="h-[3px] flex-1" />
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {done}/{tasks.length}
          </span>
        </div>
      ) : (
        <p className="mb-2.5 text-[11px] text-muted-foreground/60">No tasks</p>
      )}

      <span className="text-[11px] text-muted-foreground/60">
        {relativeTime(lastLog?.createdAt ?? project.createdAt)}
      </span>
    </Link>
  )
}
