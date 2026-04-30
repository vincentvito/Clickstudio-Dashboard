"use client"

import { useMemo, ViewTransition } from "react"
import Link from "next/link"
import { Lightbulb, Loader2, Mic, Sparkles, Type } from "lucide-react"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useIdeas } from "@/lib/store"
import { cn } from "@/lib/utils"

export function IdeasLane() {
  const { ideas } = useIdeas()
  const pending = useMemo(() => ideas.filter((i) => i.status === "Pending"), [ideas])

  if (pending.length === 0) return null

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/60 inline-flex size-5 items-center justify-center">
            <Lightbulb className="size-3" strokeWidth={2.5} />
          </span>
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Idea bucket
          </h2>
          <span className="text-muted-foreground/60 text-xs tabular-nums">{pending.length}</span>
        </div>
        <Link
          href="/dashboard/ideas"
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
        >
          View all
        </Link>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {pending.map((idea) => {
            const SourceIcon =
              idea.nameSearchStatus === "Running"
                ? Loader2
                : idea.nameSuggestions.length > 0
                  ? Sparkles
                  : idea.source === "Voice"
                    ? Mic
                    : Type
            return (
              <ViewTransition key={idea.id} enter="fade-in" exit="fade-out">
                <Link
                  href="/dashboard/ideas"
                  className={cn(
                    "border-border/60 bg-card hover:bg-accent group inline-flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-xs transition-all",
                    "shadow-sm shadow-yellow-500/10 hover:shadow-md hover:shadow-yellow-500/25",
                    "dark:shadow-yellow-400/10 dark:hover:shadow-yellow-400/25",
                  )}
                  title={idea.title}
                >
                  <SourceIcon
                    className={cn(
                      "size-3.5 shrink-0 text-yellow-500 dark:text-yellow-300",
                      idea.nameSearchStatus === "Running" && "animate-spin",
                    )}
                    strokeWidth={2.5}
                  />
                  <span className="text-foreground font-medium">{idea.title}</span>
                </Link>
              </ViewTransition>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  )
}
