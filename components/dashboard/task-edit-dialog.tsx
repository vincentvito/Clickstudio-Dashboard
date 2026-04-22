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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useOrgMembers } from "@/lib/store"
import type { Task } from "@/lib/types"
import { Check, Users } from "lucide-react"
import { TiptapEditor } from "./tiptap-editor"

interface TaskEditDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, updates: Partial<Task> & { assigneeIds?: string[] }) => void
}

export function TaskEditDialog({ task, open, onOpenChange, onSave }: TaskEditDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const { members } = useOrgMembers()

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? "")
      setAssigneeIds(task.assignees?.map((a) => a.id) ?? [])
    }
  }, [task, open])

  if (!task) return null

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave(task!.id, { title: title.trim(), description, assigneeIds })
    onOpenChange(false)
  }

  const selectedMembers = members.filter((m) => assigneeIds.includes(m.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>Ctrl+Enter to save.</DialogDescription>
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
            rows={2}
          />

          <div
            key={task.id}
            className="border-input bg-background focus-within:ring-ring max-h-64 min-h-20 overflow-y-auto rounded-md border px-3 py-2 text-sm focus-within:ring-1"
          >
            <TiptapEditor
              value={description}
              onChange={setDescription}
              placeholder="Add a description... Use @ to mention teammates."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assignees</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                  {selectedMembers.length > 0 ? (
                    <>
                      <div className="flex -space-x-1.5">
                        {selectedMembers.slice(0, 3).map((m) => (
                          <Avatar key={m.id} className="ring-background size-5 ring-1">
                            {m.image && <AvatarImage src={m.image} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-[7px]">
                              {(m.name?.[0] || m.email[0]).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="truncate">
                        {selectedMembers.map((m) => m.name || m.email.split("@")[0]).join(", ")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="text-muted-foreground size-4" />
                      <span className="text-muted-foreground">Select assignees</span>
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {members.map((m) => {
                  const selected = assigneeIds.includes(m.id)
                  return (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={(e) => {
                        e.preventDefault()
                        toggleAssignee(m.id)
                      }}
                    >
                      <div className="flex w-full items-center gap-2">
                        <Avatar className="size-5">
                          {m.image && <AvatarImage src={m.image} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-[7px]">
                            {(m.name?.[0] || m.email[0]).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{m.name || m.email.split("@")[0]}</span>
                        {selected && <Check className="text-primary size-3.5" />}
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button type="submit" className="w-full">
            Save
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
