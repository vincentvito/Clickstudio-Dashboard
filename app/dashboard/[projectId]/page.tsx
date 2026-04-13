"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { DailyLog } from "@/components/dashboard/daily-log"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { useStore } from "@/lib/store"
import { TASK_SECTIONS } from "@/lib/constants"
import type { ProjectState, TaskSection } from "@/lib/types"
import { Pencil, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const {
    data,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addLog,
  } = useStore()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const project = data.projects.find((p) => p.id === params.projectId)
  const tasks = data.tasks.filter((t) => t.projectId === params.projectId)
  const logs = data.logs.filter((l) => l.projectId === params.projectId)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="mb-4 text-sm text-muted-foreground">Project not found</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const links = project.artifactLinks.split("\n").filter((l) => l.trim())

  function handleEdit(formData: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) {
    updateProject(project!.id, formData)
  }

  function handleDelete() {
    deleteProject(project!.id)
    router.push("/dashboard")
  }

  function handleAddTask(section: TaskSection, columnId: string, title: string) {
    addTask({
      projectId: project!.id,
      section,
      title,
      columnId,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/dashboard"
            className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Projects
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <h1 className="truncate text-sm font-semibold text-foreground">
            {project.title}
          </h1>
          <StatusBadge state={project.state} className="shrink-0" />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setEditDialogOpen(true)}
            className="text-muted-foreground"
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Brain dump + links (only if content exists) */}
      {(project.brainDump || links.length > 0) && (
        <div className="border-b border-border/50 px-4 py-3 sm:px-6">
          {project.brainDump && (
            <p className="max-h-16 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {project.brainDump}
            </p>
          )}
          {links.length > 0 && (
            <div className={`flex flex-wrap gap-1.5 ${project.brainDump ? "mt-2" : ""}`}>
              {links.map((link, i) => {
                const href = link.trim().startsWith("http")
                  ? link.trim()
                  : `https://${link.trim()}`
                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-[220px] items-center gap-1 truncate rounded border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ExternalLink className="size-2.5 shrink-0" />
                    {link.trim().replace(/^https?:\/\//, "").slice(0, 35)}
                  </a>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border/50 px-4 sm:px-6">
          <TabsList variant="line">
            <TabsTrigger value="tasks">
              Tasks
              <span className="ml-1 tabular-nums opacity-40">{tasks.length}</span>
            </TabsTrigger>
            <TabsTrigger value="log">
              Log
              <span className="ml-1 tabular-nums opacity-40">{logs.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="flex-1 overflow-auto p-4 sm:p-6">
          {TASK_SECTIONS.map((section) => (
            <KanbanBoard
              key={section}
              tasks={tasks}
              section={section}
              onAddTask={handleAddTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
            />
          ))}
        </TabsContent>

        <TabsContent value="log" className="flex-1 overflow-auto p-4 sm:p-6">
          <DailyLog logs={logs} onAdd={(text) => addLog(project.id, text)} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSubmit={handleEdit}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete project"
        description={`This will permanently delete "${project.title}" and all its tasks and logs. This action cannot be undone.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
