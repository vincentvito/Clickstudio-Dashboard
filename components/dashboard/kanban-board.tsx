"use client"

import { useState, useRef, useEffect } from "react"
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
import { TaskEditDialog } from "./task-edit-dialog"
import { ConfirmDialog } from "./confirm-dialog"
import { SECTION_CONFIG } from "@/lib/constants"
import type { Task, TaskSection } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Plus, Trash2 } from "lucide-react"

const COLUMNS: { id: string; name: string; color: KanbanBoardCircleColor }[] = [
  { id: "todo", name: "To-Do", color: "gray" },
  { id: "in-progress", name: "In Progress", color: "blue" },
  { id: "done", name: "Done", color: "green" },
]

interface KanbanBoardProps {
  tasks: Task[]
  section: TaskSection
  onAddTask: (section: TaskSection, columnId: string, title: string) => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onDeleteTask: (id: string) => void
  onMoveTask: (id: string, columnId: string) => void
}

export function KanbanBoard({
  tasks,
  section,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
}: KanbanBoardProps) {
  const filtered = tasks.filter((t) => t.section === section)
  const sectionConfig = SECTION_CONFIG[section]

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [creatingIn, setCreatingIn] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (creatingIn && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [creatingIn])

  function handleCreateSubmit() {
    if (newTitle.trim() && creatingIn) {
      onAddTask(section, creatingIn, newTitle.trim())
    }
    setNewTitle("")
    setCreatingIn(null)
  }

  function handleCreateKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleCreateSubmit()
    }
    if (e.key === "Escape") {
      setNewTitle("")
      setCreatingIn(null)
    }
  }

  function handleDropOnColumn(columnId: string) {
    return (dataTransferData: string) => {
      const data = JSON.parse(dataTransferData) as { id: string }
      onMoveTask(data.id, columnId)
    }
  }

  function handleDropOnItem(columnId: string) {
    return (dataTransferData: string) => {
      const data = JSON.parse(dataTransferData) as { id: string }
      onMoveTask(data.id, columnId)
    }
  }

  return (
    <div className="mb-6">
      <div className="mb-2">
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            sectionConfig.color,
          )}
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
                onDropOverColumn={handleDropOnColumn(column.id)}
                className="min-w-52 flex-1"
              >
                <KanbanBoardColumnHeader>
                  <KanbanBoardColumnTitle columnId={column.id}>
                    <KanbanColorCircle color={column.color} />
                    {column.name}
                    <span className="ml-1.5 text-xs opacity-50">
                      {columnTasks.length}
                    </span>
                  </KanbanBoardColumnTitle>
                </KanbanBoardColumnHeader>

                <KanbanBoardColumnList>
                  {columnTasks.length === 0 && creatingIn !== column.id && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Drop tasks here
                    </li>
                  )}
                  {columnTasks.map((task) => (
                    <KanbanBoardColumnListItem
                      key={task.id}
                      cardId={task.id}
                      onDropOverListItem={handleDropOnItem(column.id)}
                    >
                      <KanbanBoardCard
                        data={{ id: task.id }}
                        onClick={() => setEditingTask(task)}
                      >
                        <KanbanBoardCardTitle className="whitespace-pre-wrap">
                          {task.title}
                        </KanbanBoardCardTitle>

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
                    <li className="px-2 py-1">
                      <KanbanBoardCardTextarea
                        ref={textareaRef}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        onBlur={handleCreateSubmit}
                        placeholder="Task title... (Ctrl+Enter to save)"
                        autoFocus
                      />
                    </li>
                  )}
                </KanbanBoardColumnList>

                <KanbanBoardColumnFooter>
                  <KanbanBoardColumnButton
                    onClick={() => {
                      setCreatingIn(column.id)
                      setNewTitle("")
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

      <TaskEditDialog
        task={editingTask}
        open={editingTask !== null}
        onOpenChange={(open) => { if (!open) setEditingTask(null) }}
        onSave={onUpdateTask}
      />

      <ConfirmDialog
        open={deletingTask !== null}
        onOpenChange={(open) => { if (!open) setDeletingTask(null) }}
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
