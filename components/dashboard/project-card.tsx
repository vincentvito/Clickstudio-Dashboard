"use client"

import { memo } from "react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"
import { StatusBadge } from "./status-badge"
import { relativeTime } from "@/lib/format"
import type { Project, Task } from "@/lib/types"

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  lastActivity: string
}

export const ProjectCard = memo(function ProjectCard({
  project,
  tasks,
  lastActivity,
}: ProjectCardProps) {
  const done = tasks.filter((t) => t.columnId === "done").length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : -1

  return (
    <Link
      href={`/dashboard/${project.id}`}
      className="group block rounded-lg border border-transparent px-4 py-3.5 transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {project.title}
            </h3>
            <StatusBadge state={project.state} />
          </div>

          {project.brainDump && (
            <p className="mb-2 line-clamp-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              {project.brainDump}
            </p>
          )}

          <div className="flex items-center gap-3">
            {pct >= 0 ? (
              <div className="flex items-center gap-2">
                <Progress value={pct} className="h-1 w-20" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {done}/{tasks.length}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/60">No tasks</span>
            )}
            <span className="text-xs text-muted-foreground/40">
              {relativeTime(lastActivity)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
})
