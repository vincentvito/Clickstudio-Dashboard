import { Badge } from "@/components/ui/badge"
import { PROJECT_STATE_CONFIG } from "@/lib/constants"
import type { ProjectState } from "@/lib/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  state: ProjectState
  className?: string
}

export function StatusBadge({ state, className }: StatusBadgeProps) {
  const config = PROJECT_STATE_CONFIG[state]

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-semibold tracking-wide",
        config.color,
        config.bg,
        config.border,
        className,
      )}
    >
      {state}
    </Badge>
  )
}
