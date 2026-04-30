"use client"

import { useState, useTransition } from "react"
import { Check, Loader2, Mic, RefreshCw, Rocket, Sparkles, Trash2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { deleteIdea, promoteIdea, retryIdeaNameFinder, updateIdeaTitle } from "@/lib/store"
import { relativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Idea, IdeaNameSuggestion } from "@/lib/types"
import { isIdeaNameSearchStuck } from "@/lib/ideas/name-search-status"

interface IdeaCardProps {
  idea: Idea
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const [promoting, setPromoting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [retryingNames, setRetryingNames] = useState(false)
  const [usingDomain, setUsingDomain] = useState<string | null>(null)
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
    setDeleteConfirmOpen(true)
  }

  function confirmDelete() {
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

  function handleRetryNames() {
    if (retryingNames || (idea.nameSearchStatus === "Running" && !isNameSearchStuck)) return
    setRetryingNames(true)
    startTransition(async () => {
      try {
        await retryIdeaNameFinder(idea.id)
      } finally {
        setRetryingNames(false)
      }
    })
  }

  function handleUseName(suggestion: IdeaNameSuggestion) {
    if (usingDomain) return
    setUsingDomain(suggestion.domain)
    startTransition(async () => {
      try {
        await updateIdeaTitle(idea.id, suggestion.name)
      } finally {
        setUsingDomain(null)
      }
    })
  }

  const SourceIcon = idea.source === "Voice" ? Mic : Type
  const isNameSearchStuck = isIdeaNameSearchStuck(idea)
  const isFindingNames =
    (idea.nameSearchStatus === "Running" && !isNameSearchStuck) || retryingNames

  return (
    <>
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
            <h3 className="text-foreground line-clamp-2 text-sm leading-snug font-semibold">
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
              <span className="text-muted-foreground/60 text-[10px]">+{links.length - 3} more</span>
            )}
          </div>
        )}

        <div className="border-border/50 bg-muted/20 rounded-md border px-2.5 py-2">
          {isFindingNames ? (
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <Loader2 className="size-3.5 shrink-0 animate-spin" />
              <span className="truncate">
                {idea.nameSearchLastDomain
                  ? `Checking ${idea.nameSearchLastDomain} (${idea.nameSearchCheckedCount}/10)...`
                  : "Generating name ideas..."}
              </span>
            </div>
          ) : idea.nameSuggestions.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Sparkles className="size-3.5 shrink-0 text-yellow-500" />
                <span>{idea.nameSuggestions.length} available name ideas</span>
              </div>
              <div className="space-y-1">
                {idea.nameSuggestions.slice(0, 2).map((suggestion) => (
                  <div key={suggestion.id} className="flex min-w-0 items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground truncate text-xs font-medium">
                        {suggestion.name}
                      </p>
                      <p className="text-muted-foreground/70 truncate font-mono text-[10px]">
                        {suggestion.domain}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 shrink-0 gap-1 px-2 text-[11px]"
                      disabled={Boolean(usingDomain)}
                      onClick={() => handleUseName(suggestion)}
                    >
                      {usingDomain === suggestion.domain ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : idea.nameSearchStatus === "Failed" || isNameSearchStuck ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground min-w-0 truncate text-xs">
                {isNameSearchStuck
                  ? "Looks like name search stalled."
                  : (idea.nameSearchError ?? "No available names found yet.")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 gap-1 px-2 text-[11px]"
                onClick={handleRetryNames}
              >
                <RefreshCw className="size-3" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="text-muted-foreground/70 flex items-center gap-2 text-xs">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="truncate">Name ideas will appear here.</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <Button size="sm" onClick={handlePromote} disabled={busy} className="h-7 gap-1.5 text-xs">
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
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete idea"
        description={`This will permanently delete "${idea.title}". This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </>
  )
}
