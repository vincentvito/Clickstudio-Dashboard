"use client"

import { useProjectStats } from "@/lib/store"
import { formatDuration } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

export function ProjectStatsStrip() {
  const { stats, isLoading } = useProjectStats()

  if (isLoading) {
    return (
      <div className="border-border/40 bg-card/40 mb-5 grid grid-cols-3 divide-x divide-border/40 rounded-lg border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="mt-2 h-6 w-14 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats || stats.totalCount === 0) return null

  const items = [
    { label: "Avg idea → live", value: formatDuration(stats.avgTimeToLiveMs) },
    { label: "Avg time in idea", value: formatDuration(stats.avgTimeInIdeaMs) },
    { label: "Live projects", value: `${stats.liveCount}` },
  ]

  return (
    <div className="border-border/40 bg-card/40 mb-5 grid grid-cols-3 divide-x divide-border/40 rounded-lg border">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            {item.label}
          </div>
          <div className="text-foreground mt-1 text-lg font-semibold tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
