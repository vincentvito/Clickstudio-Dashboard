"use client"

import { useProjectStats } from "@/lib/store"
import { formatDuration } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function ProjectStatsStrip() {
  const { stats, isLoading } = useProjectStats()

  if (isLoading) {
    return (
      <div className="mb-5 grid grid-cols-3 gap-1.5 sm:gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-border/40 bg-card/40 flex h-[88px] flex-col justify-between rounded-lg border p-3 sm:h-24 sm:p-4"
          >
            <Skeleton className="h-2.5 w-16 rounded sm:w-20" />
            <Skeleton className="h-6 w-10 rounded sm:h-7" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats || stats.totalCount === 0) return null

  const items = [
    { label: "Avg backlog → live", value: formatDuration(stats.avgTimeToLiveMs) },
    { label: "Avg time in backlog", value: formatDuration(stats.avgTimeInBacklogMs) },
    { label: "Live projects", value: `${stats.liveCount}` },
  ]

  return (
    <div className="mb-5 grid grid-cols-3 gap-1.5 sm:gap-2">
      {items.map((item) => {
        const empty = item.value === "—"
        return (
          <div
            key={item.label}
            className={cn(
              "border-border/40 bg-card/40 flex h-[88px] flex-col justify-between rounded-lg border p-3 sm:h-24 sm:p-4",
              "hover:border-border/80 transition-colors",
            )}
          >
            <div className="text-muted-foreground/80 text-[10px] leading-tight font-medium tracking-wider uppercase sm:text-[11px]">
              {item.label}
            </div>
            <div
              className={cn(
                "text-foreground text-2xl leading-none font-bold tabular-nums sm:text-3xl",
                empty && "text-muted-foreground/40 text-xl sm:text-2xl",
              )}
            >
              {item.value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
