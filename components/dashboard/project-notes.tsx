"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ConfirmDialog } from "./confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotes, createNote, updateNote, deleteNote } from "@/lib/store"
import { relativeTime } from "@/lib/format"
import type { Note } from "@/lib/types"
import { Plus, Trash2, FileText, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface ProjectNotesProps {
  projectId: string
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { notes, isLoading } = useNotes(projectId)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save with debounce -- saves after 1s of no typing
  const debouncedSave = useCallback(
    (noteId: string, newTitle: string, newContent: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        await updateNote(noteId, {
          title: newTitle.trim() || "Untitled",
          content: newContent,
        })
      }, 1000)
    },
    [],
  )

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  async function handleCreate() {
    setCreating(true)
    try {
      const note = await createNote(projectId, { title: "", content: "" })
      setEditingNoteId(note.id)
      setTitle("")
      setContent("")
      setTimeout(() => {
        titleRef.current?.focus()
        titleRef.current?.select()
      }, 50)
    } finally {
      setCreating(false)
    }
  }

  function startEditing(note: Note) {
    // Flush any pending save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setEditingNoteId(note.id)
    setTitle(note.title)
    setContent(note.content)
  }

  async function handleBack() {
    // Save before going back
    if (editingNoteId) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      await updateNote(editingNoteId, {
        title: title.trim() || "Untitled",
        content,
      })
    }
    setEditingNoteId(null)
  }

  async function handleDelete() {
    if (!deletingNoteId) return
    await deleteNote(deletingNoteId)
    setDeletingNoteId(null)
    if (editingNoteId === deletingNoteId) {
      setEditingNoteId(null)
    }
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (editingNoteId) debouncedSave(editingNoteId, value, content)
  }

  function handleContentChange(value: string) {
    setContent(value)
    if (editingNoteId) debouncedSave(editingNoteId, title, value)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  // Editing view
  if (editingNoteId) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleBack}>
            <ArrowLeft className="size-3.5" />
            Notes
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setDeletingNoteId(editingNoteId)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <Input
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="mb-3 border-none bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
        />

        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your notes here..."
          className="min-h-[300px] border-none bg-transparent px-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
        />

        <p className="mt-2 text-[11px] text-muted-foreground/40">
          Auto-saves as you type
        </p>

        <ConfirmDialog
          open={deletingNoteId !== null}
          onOpenChange={(open) => { if (!open) setDeletingNoteId(null) }}
          title="Delete note"
          description="This will permanently delete this note."
          onConfirm={handleDelete}
        />
      </div>
    )
  }

  // List view
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Notes
        </span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCreate} disabled={creating}>
          <Plus className="size-3.5" />
          New note
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No notes yet — create one to get started
        </p>
      ) : (
        <div className="space-y-1">
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => startEditing(note)}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-accent/5"
            >
              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-foreground">
                  {note.title || "Untitled"}
                </h3>
                {note.content && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {note.content}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {note.author && (
                    <Avatar className="size-4">
                      {note.author.image && <AvatarImage src={note.author.image} />}
                      <AvatarFallback className="bg-primary/10 text-[6px] text-primary">
                        {(note.author.name?.[0] ?? note.author.email[0]).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="text-[11px] text-muted-foreground/60">
                    {relativeTime(note.updatedAt)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
