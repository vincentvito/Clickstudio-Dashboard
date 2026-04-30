import type { Idea } from "@/lib/types"

export const NAME_SEARCH_STALE_MS = 120_000

export function isIdeaNameSearchStuck(
  idea: Pick<Idea, "nameSearchStatus" | "nameSearchUpdatedAt">,
) {
  if (idea.nameSearchStatus !== "Running" || !idea.nameSearchUpdatedAt) return false

  const updatedAt = Date.parse(idea.nameSearchUpdatedAt)
  return Number.isFinite(updatedAt) && Date.now() - updatedAt > NAME_SEARCH_STALE_MS
}
