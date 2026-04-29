"use client"

import { useMemo, ViewTransition } from "react"
import { Lightbulb } from "lucide-react"
import { useIdeas } from "@/lib/store"
import { IdeaCard } from "@/components/dashboard/idea-card"
import { Skeleton } from "@/components/ui/skeleton"

export default function IdeasPage() {
  const { ideas, isLoading } = useIdeas()
  const pending = useMemo(() => ideas.filter((i) => i.status === "Pending"), [ideas])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-center gap-2">
        <Lightbulb className="text-muted-foreground size-4" />
        <h1 className="text-foreground text-lg font-bold tracking-tight">Ideas</h1>
        {pending.length > 0 && (
          <span className="text-muted-foreground/60 text-sm tabular-nums">
            {pending.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="border-border/40 rounded-lg border border-dashed px-6 py-16 text-center">
          <Lightbulb className="text-muted-foreground/40 mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">No pending ideas yet.</p>
          <p className="text-muted-foreground/60 mt-1 text-xs">
            Tap the yellow <span className="font-medium">Idea</span> button to drop your first one.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {pending.map((idea) => (
            <ViewTransition key={idea.id} enter="fade-in" exit="fade-out">
              <IdeaCard idea={idea} />
            </ViewTransition>
          ))}
        </div>
      )}
    </div>
  )
}
