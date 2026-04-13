"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProjectCard } from "@/components/dashboard/project-card"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { useProjects, createProject } from "@/lib/store"
import { PROJECT_STATES, PROJECT_STATE_CONFIG } from "@/lib/constants"
import { Plus } from "lucide-react"
import type { ProjectState } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { projects, tasks, logs, isLoading } = useProjects()
  const [filter, setFilter] = useState<"All" | ProjectState>("All")
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered =
    filter === "All"
      ? projects
      : projects.filter((p) => p.state === filter)

  const sorted = [...filtered].sort((a, b) => {
    const la =
      logs
        .filter((l) => l.projectId === b.id)
        .sort((x, y) => (y.createdAt > x.createdAt ? 1 : -1))[0]?.createdAt ?? b.createdAt
    const lb =
      logs
        .filter((l) => l.projectId === a.id)
        .sort((x, y) => (y.createdAt > x.createdAt ? 1 : -1))[0]?.createdAt ?? a.createdAt
    return la > lb ? -1 : 1
  })

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
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
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
              tasks={tasks.filter((t) => t.projectId === project.id)}
              logs={logs}
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
