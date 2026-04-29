"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import {
  KanbanBoardProvider,
  KanbanBoard as KanbanBoardRoot,
  KanbanBoardColumn,
  KanbanBoardColumnHeader,
  KanbanBoardColumnTitle,
  KanbanBoardColumnList,
  KanbanBoardColumnListItem,
  KanbanBoardColumnFooter,
  KanbanBoardColumnButton,
  KanbanBoardCard,
  KanbanBoardCardTitle,
  KanbanBoardCardButtonGroup,
  KanbanBoardCardButton,
  KanbanBoardCardTextarea,
  KanbanColorCircle,
  type KanbanBoardCircleColor,
} from "@/components/kanban"
// TaskEditDialog pulls in Tiptap (StarterKit + Mention + Suggestion) — heavy.
// Load it on demand so a kanban view that never edits stays light.
const TaskEditDialog = dynamic(
  () => import("./task-edit-dialog").then((m) => ({ default: m.TaskEditDialog })),
  { ssr: false },
)
import { ConfirmDialog } from "./confirm-dialog"
import { MentionRenderer } from "./mention-renderer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useOrgMembers } from "@/lib/store"
import { SECTION_CONFIG } from "@/lib/constants"
import type { Task, TaskSection } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, Trash2, UserCircle, Loader2, Check } from "lucide-react"

const COLUMNS: { id: string; name: string; color: KanbanBoardCircleColor }[] = [
  { id: "todo", name: "To-Do", color: "gray" },
  { id: "in-progress", name: "In Progress", color: "blue" },
  { id: "done", name: "Done", color: "green" },
]

interface KanbanBoardProps {
  tasks: Task[]
  section: TaskSection
  onAddTask: (section: TaskSection, columnId: string, title: string, assigneeIds?: string[]) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onDeleteTask: (id: string) => void
  onMoveTask: (id: string, columnId: string) => void
  focusTaskId?: string | null
  onFocusHandled?: () => void
}

export function KanbanBoard({
  tasks,
  section,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  focusTaskId,
  onFocusHandled,
}: KanbanBoardProps) {
  const filtered = useMemo(() => tasks.filter((t) => t.section === section), [tasks, section])
  const sectionConfig = SECTION_CONFIG[section]
  const { members } = useOrgMembers()

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [hasEverEdited, setHasEverEdited] = useState(false)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  // Once the user opens an edit dialog, keep the dialog mounted across closes
  // so its (cached) Tiptap chunk and internal state stick around for re-opens.
  useEffect(() => {
    if (editingTask && !hasEverEdited) setHasEverEdited(true)
  }, [editingTask, hasEverEdited])
  const [creatingIn, setCreatingIn] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newAssigneeIds, setNewAssigneeIds] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (creatingIn && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [creatingIn])

  // Auto-open task from notification deep link.
  // We read `filtered` via ref to avoid re-running when the tasks array reference changes.
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered
  useEffect(() => {
    if (!focusTaskId) return
    const task = filteredRef.current.find((t) => t.id === focusTaskId)
    if (task) {
      setEditingTask(task)
      onFocusHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTaskId])

  async function handleCreateSubmit() {
    if (!newTitle.trim() || !creatingIn) return
    setIsCreating(true)
    try {
      await onAddTask(
        section,
        creatingIn,
        newTitle.trim(),
        newAssigneeIds.length > 0 ? newAssigneeIds : undefined,
      )
    } finally {
      setIsCreating(false)
      setNewTitle("")
      setNewAssigneeIds([])
      setCreatingIn(null)
    }
  }

  function handleCreateKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreateSubmit()
    }
    if (e.key === "Escape") {
      setNewTitle("")
      setNewAssigneeIds([])
      setCreatingIn(null)
    }
  }

  function toggleNewAssignee(userId: string) {
    setNewAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleDrop = useCallback(
    (columnId: string) => (dataTransferData: string) => {
      const data = JSON.parse(dataTransferData) as { id: string }
      onMoveTask(data.id, columnId)
    },
    [onMoveTask],
  )

  return (
    <div className="mb-6">
      <div className="mb-2">
        <span
          className={cn("text-[11px] font-semibold tracking-wide uppercase", sectionConfig.color)}
        >
          {section}
        </span>
      </div>

      <KanbanBoardProvider>
        <KanbanBoardRoot className="gap-3">
          {COLUMNS.map((column) => {
            const columnTasks = filtered.filter((t) => t.columnId === column.id)

            return (
              <KanbanBoardColumn
                key={column.id}
                columnId={column.id}
                onDropOverColumn={handleDrop(column.id)}
                className="min-w-52 flex-1"
              >
                <KanbanBoardColumnHeader>
                  <KanbanBoardColumnTitle columnId={column.id}>
                    <KanbanColorCircle color={column.color} />
                    {column.name}
                    <span className="ml-1.5 text-xs opacity-50">{columnTasks.length}</span>
                  </KanbanBoardColumnTitle>
                </KanbanBoardColumnHeader>

                <KanbanBoardColumnList>
                  {columnTasks.length === 0 && creatingIn !== column.id && (
                    <li className="text-muted-foreground px-3 py-6 text-center text-xs">
                      Drop tasks here
                    </li>
                  )}
                  {columnTasks.map((task) => (
                    <KanbanBoardColumnListItem
                      key={task.id}
                      cardId={task.id}
                      onDropOverListItem={handleDrop(column.id)}
                    >
                      <KanbanBoardCard data={{ id: task.id }} onClick={() => setEditingTask(task)}>
                        <KanbanBoardCardTitle className="whitespace-pre-wrap">
                          {task.title}
                        </KanbanBoardCardTitle>

                        {task.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                            <MentionRenderer content={task.description} />
                          </p>
                        )}

                        {task.assignees?.length > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              {task.assignees.slice(0, 3).map((a) => (
                                <Tooltip key={a.id}>
                                  <TooltipTrigger asChild>
                                    <Avatar className="ring-background size-5 ring-1">
                                      {a.image && <AvatarImage src={a.image} />}
                                      <AvatarFallback className="bg-primary/10 text-primary text-[7px] font-semibold">
                                        {(a.name?.[0] || a.email[0]).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>{a.name || a.email}</TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                            <span className="text-muted-foreground truncate text-[11px]">
                              {task.assignees
                                .slice(0, 2)
                                .map((a) => a.name || a.email.split("@")[0])
                                .join(", ")}
                              {task.assignees.length > 2 && ` +${task.assignees.length - 2}`}
                            </span>
                          </div>
                        )}

                        <KanbanBoardCardButtonGroup>
                          <KanbanBoardCardButton
                            tooltip="Delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingTask(task)
                            }}
                          >
                            <Trash2 />
                          </KanbanBoardCardButton>
                        </KanbanBoardCardButtonGroup>
                      </KanbanBoardCard>
                    </KanbanBoardColumnListItem>
                  ))}

                  {creatingIn === column.id && (
                    <li className="space-y-1.5 px-2 py-1">
                      <KanbanBoardCardTextarea
                        ref={textareaRef}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        placeholder="Task title... (Ctrl+Enter to save)"
                        autoFocus
                        disabled={isCreating}
                      />
                      <div className="flex items-center justify-between">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="text-muted-foreground gap-1"
                            >
                              {newAssigneeIds.length > 0 ? (
                                <>
                                  <div className="flex -space-x-1">
                                    {newAssigneeIds.slice(0, 2).map((id) => {
                                      const m = members.find((m) => m.id === id)
                                      return (
                                        <Avatar key={id} className="ring-background size-4 ring-1">
                                          <AvatarFallback className="bg-primary/10 text-primary text-[6px]">
                                            {(m?.name?.[0] || m?.email?.[0] || "?").toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                      )
                                    })}
                                  </div>
                                  <span className="truncate">
                                    {newAssigneeIds
                                      .map((id) => {
                                        const m = members.find((m) => m.id === id)
                                        return m?.name || m?.email?.split("@")[0] || "?"
                                      })
                                      .join(", ")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <UserCircle className="size-3.5" />
                                  Assign
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            {members.map((m) => {
                              const selected = newAssigneeIds.includes(m.id)
                              return (
                                <DropdownMenuItem
                                  key={m.id}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    toggleNewAssignee(m.id)
                                  }}
                                >
                                  <div className="flex w-full items-center gap-2">
                                    <Avatar className="size-5">
                                      {m.image && <AvatarImage src={m.image} />}
                                      <AvatarFallback className="bg-primary/10 text-primary text-[7px]">
                                        {(m.name?.[0] || m.email[0]).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate text-sm">
                                      {m.name || m.email.split("@")[0]}
                                    </span>
                                    {selected && <Check className="text-primary size-3.5" />}
                                  </div>
                                </DropdownMenuItem>
                              )
                            })}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="xs"
                          onClick={handleCreateSubmit}
                          disabled={!newTitle.trim() || isCreating}
                        >
                          {isCreating ? <Loader2 className="size-3 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    </li>
                  )}
                </KanbanBoardColumnList>

                <KanbanBoardColumnFooter>
                  <KanbanBoardColumnButton
                    onClick={() => {
                      setCreatingIn(column.id)
                      setNewTitle("")
                      setNewAssigneeIds([])
                    }}
                  >
                    <Plus className="mr-1 size-3.5" />
                    Add task
                  </KanbanBoardColumnButton>
                </KanbanBoardColumnFooter>
              </KanbanBoardColumn>
            )
          })}
        </KanbanBoardRoot>
      </KanbanBoardProvider>

      {hasEverEdited && (
        <TaskEditDialog
          task={editingTask}
          open={editingTask !== null}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null)
          }}
          onSave={onUpdateTask}
        />
      )}

      <ConfirmDialog
        open={deletingTask !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTask(null)
        }}
        title="Delete task"
        description="This will permanently delete this task. This action cannot be undone."
        onConfirm={() => {
          if (deletingTask) onDeleteTask(deletingTask.id)
          setDeletingTask(null)
        }}
      />
    </div>
  )
}
