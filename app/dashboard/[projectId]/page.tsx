"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { KanbanBoard } from "@/components/dashboard/kanban-board"
import { DailyLog } from "@/components/dashboard/daily-log"
import { ProjectNotes } from "@/components/dashboard/project-notes"
import { ProjectFormDialog } from "@/components/dashboard/project-form-dialog"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import {
  useProject,
  updateProject,
  deleteProject,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  createLog,
} from "@/lib/store"
import { TASK_SECTIONS } from "@/lib/constants"
import type { ProjectState, TaskSection } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()

  const { project, tasks, logs, isLoading } = useProject(params.projectId)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "tasks")
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null)

  // Pick up tab/task/note from URL params (notification deep-links)
  useEffect(() => {
    const tab = searchParams.get("tab")
    const taskId = searchParams.get("task")
    const noteId = searchParams.get("note")
    if (tab) setActiveTab(tab)
    if (taskId) setFocusTaskId(taskId)
    if (noteId) setFocusNoteId(noteId)
  }, [searchParams])

  const projectId = project?.id

  const handleAddTask = useCallback(
    async (section: TaskSection, columnId: string, title: string, assigneeIds?: string[]) => {
      if (!projectId) return
      await createTask(projectId, { title, columnId, section, assigneeIds })
    },
    [projectId],
  )

  const handleUpdateTask = useCallback(
    async (id: string, updates: Partial<{ title: string; columnId: string }>) => {
      await updateTask(id, updates)
    },
    [],
  )

  const handleDeleteTask = useCallback(async (id: string) => {
    await deleteTask(id)
  }, [])

  const handleMoveTask = useCallback(
    async (id: string, columnId: string) => {
      await moveTask(id, columnId, projectId)
    },
    [projectId],
  )

  const handleAddLog = useCallback(
    async (text: string) => {
      if (!projectId) return
      await createLog(projectId, text)
    },
    [projectId],
  )

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-border/50 flex items-center gap-2 border-b px-4 py-3 sm:px-6">
          <Skeleton className="h-4 w-16 rounded" />
          <span className="text-muted-foreground/30">/</span>
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-6 w-48 rounded-md" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 flex-1 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-muted-foreground mb-4 text-sm">Project not found</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    )
  }

  const links = project.artifactLinks.split("\n").filter((l) => l.trim())

  async function handleEdit(formData: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) {
    await updateProject(project!.id, formData)
  }

  async function handleDelete() {
    await deleteProject(project!.id)
    router.push("/dashboard")
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="border-border/50 flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground shrink-0 text-xs transition-colors"
          >
            Projects
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <h1 className="text-foreground truncate text-sm font-semibold">{project.title}</h1>
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

      {/* Brain dump + links */}
      {(project.brainDump || links.length > 0) && (
        <div className="border-border/50 border-b px-4 py-4 sm:px-6">
          {project.brainDump && (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {project.brainDump}
            </p>
          )}
          {links.length > 0 && (
            <div className={project.brainDump ? "mt-3" : ""}>
              <span className="text-muted-foreground mb-1.5 block text-[10px] font-semibold tracking-wide uppercase">
                Links
              </span>
              <div className="flex flex-wrap gap-1.5">
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
                      className="border-border/50 text-muted-foreground hover:text-foreground inline-flex max-w-[220px] items-center gap-1 truncate rounded border px-2 py-0.5 text-[11px] transition-colors"
                    >
                      <ExternalLink className="size-2.5 shrink-0" />
                      {link
                        .trim()
                        .replace(/^https?:\/\//, "")
                        .slice(0, 35)}
                    </a>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-border/50 border-b px-4 sm:px-6">
          <TabsList variant="line">
            <TabsTrigger value="tasks">
              Tasks
              <span className="ml-1 tabular-nums opacity-40">{tasks.length}</span>
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
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
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onMoveTask={handleMoveTask}
              focusTaskId={focusTaskId}
              onFocusHandled={() => setFocusTaskId(null)}
            />
          ))}
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-auto p-4 sm:p-6">
          <ProjectNotes
            projectId={project.id}
            focusNoteId={focusNoteId}
            onFocusHandled={() => setFocusNoteId(null)}
          />
        </TabsContent>

        <TabsContent value="log" className="flex-1 overflow-auto p-4 sm:p-6">
          <DailyLog logs={logs} onAdd={handleAddLog} />
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
