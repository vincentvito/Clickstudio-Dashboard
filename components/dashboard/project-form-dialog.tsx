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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PROJECT_STATES, PROJECT_STATE_CONFIG } from "@/lib/constants"
import type { Project, ProjectState } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSubmit: (data: {
    title: string
    brainDump: string
    artifactLinks: string
    state: ProjectState
  }) => void
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: ProjectFormDialogProps) {
  const [title, setTitle] = useState("")
  const [brainDump, setBrainDump] = useState("")
  const [artifactLinks, setArtifactLinks] = useState("")
  const [state, setState] = useState<ProjectState>("Backlog")

  useEffect(() => {
    if (project) {
      setTitle(project.title)
      setBrainDump(project.brainDump)
      setArtifactLinks(project.artifactLinks)
      setState(project.state)
    } else {
      setTitle("")
      setBrainDump("")
      setArtifactLinks("")
      setState("Backlog")
    }
  }, [project, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), brainDump, artifactLinks, state })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update your project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          <div className="space-y-2.5">
            <label htmlFor="title" className="text-foreground text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-foreground text-sm font-medium">Status</label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATES.map((s) => {
                const config = PROJECT_STATE_CONFIG[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setState(s)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                      state === s
                        ? cn(config.bg, config.color, config.border)
                        : "border-border text-muted-foreground hover:border-border/80",
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="braindump" className="text-foreground text-sm font-medium">
              Brain dump
            </label>
            <Textarea
              id="braindump"
              value={brainDump}
              onChange={(e) => setBrainDump(e.target.value)}
              placeholder="Core concept, target audience, differentiator..."
              rows={3}
            />
          </div>

          <div className="space-y-2.5">
            <label htmlFor="links" className="text-foreground text-sm font-medium">
              Links <span className="text-muted-foreground">(one per line)</span>
            </label>
            <Textarea
              id="links"
              value={artifactLinks}
              onChange={(e) => setArtifactLinks(e.target.value)}
              placeholder={"https://competitor.com\nhttps://dribbble.com/..."}
              rows={2}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" className="flex-1">
              {project ? "Save changes" : "Create project"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
