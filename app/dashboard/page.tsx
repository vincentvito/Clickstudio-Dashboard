"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/dashboard/project-card"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { useProjects, createProject } from "@/lib/store"
import { PROJECT_STATES, PROJECT_STATE_CONFIG } from "@/lib/constants"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import type { ProjectState } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { projects, logs, isLoading } = useProjects()
  const [filter, setFilter] = useState<"All" | ProjectState>("All")
  const [dialogOpen, setDialogOpen] = useState(false)

  // Pre-compute latest log timestamp per project (O(n) instead of O(n²))
  const latestLogByProject = useMemo(() => {
    const map = new Map<string, string>()
    for (const log of logs) {
      const existing = map.get(log.projectId)
      if (!existing || log.createdAt > existing) {
        map.set(log.projectId, log.createdAt)
      }
    }
    return map
  }, [logs])

  const sorted = useMemo(() => {
    const filtered =
      filter === "All"
        ? projects
        : projects.filter((p) => p.state === filter)

    return [...filtered].sort((a, b) => {
      const la = latestLogByProject.get(b.id) ?? b.createdAt
      const lb = latestLogByProject.get(a.id) ?? a.createdAt
      return la > lb ? -1 : 1
    })
  }, [projects, filter, latestLogByProject])

  async function handleSubmit(formData: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) {
    await createProject(formData)
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-md" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-foreground">Projects</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="size-3.5" />
          New project
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-1">
        {(["All", ...PROJECT_STATES] as const).map((s) => {
          const isActive = filter === s
          const config = s !== "All" ? PROJECT_STATE_CONFIG[s] : null

          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? config
                    ? cn(config.bg, config.color)
                    : "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
              {s !== "All" && (
                <span className="ml-1 tabular-nums opacity-50">
                  {projects.filter((p) => p.state === s).length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          {filter === "All"
            ? "No projects yet — create one to get started"
            : `No ${filter.toLowerCase()} projects`}
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {sorted.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={project.tasks ?? []}
              lastActivity={latestLogByProject.get(project.id) ?? project.createdAt}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
