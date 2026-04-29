"use client"

import { useState, useTransition } from "react"
import { Loader2, Mic, Rocket, Trash2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteIdea, promoteIdea } from "@/lib/store"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Idea } from "@/lib/types"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const [promoting, setPromoting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [, startTransition] = useTransition()
  const busy = promoting || deleting

  const links = idea.links
    ? idea.links
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : []

  function handlePromote() {
    if (busy) return
    setPromoting(true)
    startTransition(async () => {
      try {
        await promoteIdea(idea.id)
      } catch {
        setPromoting(false)
      }
    })
  }

  function handleDelete() {
    if (busy) return
    setDeleting(true)
    startTransition(async () => {
      try {
        await deleteIdea(idea.id)
      } catch {
        setDeleting(false)
      }
    })
  }

  const SourceIcon = idea.source === "Voice" ? Mic : Type

  return (
    <div
      className={cn(
        "border-border/60 bg-card group relative flex flex-col gap-3 rounded-lg border p-4 transition-shadow",
        "shadow-sm shadow-yellow-500/10 hover:shadow-md hover:shadow-yellow-500/25",
        "dark:shadow-yellow-400/10 dark:hover:shadow-yellow-400/20",
        busy && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md",
            idea.source === "Voice"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
          )}
          aria-label={idea.source === "Voice" ? "Voice capture" : "Text capture"}
        >
          <SourceIcon className="size-3" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-foreground line-clamp-2 text-sm font-semibold leading-snug">
            {idea.title}
          </h3>
          <p className="text-muted-foreground/60 mt-0.5 text-xs">
            {relativeTime(idea.createdAt)}
          </p>
        </div>
      </div>

      {idea.description && (
        <p className="text-muted-foreground line-clamp-3 text-[13px] leading-relaxed">
          {idea.description}
        </p>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {links.slice(0, 3).map((l, i) => (
            <span
              key={i}
              className="bg-muted text-muted-foreground inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 font-mono text-[10px]"
              title={l}
            >
              {l.replace(/^https?:\/\//, "")}
            </span>
          ))}
          {links.length > 3 && (
            <span className="text-muted-foreground/60 text-[10px]">
              +{links.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <Button
          size="sm"
          onClick={handlePromote}
          disabled={busy}
          className="h-7 gap-1.5 text-xs"
        >
          {promoting ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Rocket className="size-3" />
          )}
          {promoting ? "Starting…" : "Start project"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={busy}
          aria-label="Delete idea"
          className="text-muted-foreground hover:text-foreground size-7 p-0"
        >
          {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
        </Button>
      </div>
    </div>
  )
}
