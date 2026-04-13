"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Task } from "@/lib/types"

interface TaskEditDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<Task>) => void
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState("")

  useEffect(() => {
    if (task) {
      setTitle(task.title)
    }
  }, [task, open])

  if (!task) return null

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(task!.id, { title: title.trim() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the task details below. Ctrl+Enter to save.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="mt-2 space-y-4">
          <Textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSave(e)
              }
            }}
            placeholder="Task title..."
            autoFocus
            rows={3}
          />

          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
