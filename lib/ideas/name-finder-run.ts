import prisma from "@/lib/prisma"
import { findIdeaNames } from "@/lib/ai/name-finder-agent"

const NAME_FINDER_TIMEOUT_MS = 55_000

const ideaInclude = {
  user: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
  promotedToProject: { select: { id: true, title: true } },
  nameSuggestions: { orderBy: { position: "asc" as const } },
}

interface RunIdeaNameFinderInput {
  ideaId: string
  organizationId: string
}

function withNameFinderTimeout<T>(promise: Promise<T>) {
  let timeout: ReturnType<typeof setTimeout>

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error("Name finder timed out"))
    }, NAME_FINDER_TIMEOUT_MS)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout))
}

export async function runIdeaNameFinder({ ideaId, organizationId }: RunIdeaNameFinderInput) {
  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, organizationId },
  })
  if (!idea) return null

  await prisma.$transaction([
    prisma.ideaNameSuggestion.deleteMany({ where: { ideaId: idea.id } }),
    prisma.idea.update({
      where: { id: idea.id },
      data: {
        nameSearchStatus: "Running",
        nameSearchError: null,
        nameSearchUpdatedAt: new Date(),
        nameSearchCheckedCount: 0,
        nameSearchLastDomain: null,
      },
    }),
  ])

  try {
    const suggestions = await withNameFinderTimeout(
      findIdeaNames({
        title: idea.title,
        description: idea.description,
        rawTranscript: idea.rawTranscript,
        onDomainChecked: async ({ domain, count }) => {
          await prisma.idea.update({
            where: { id: idea.id },
            data: {
              nameSearchCheckedCount: count,
              nameSearchLastDomain: domain || null,
              nameSearchUpdatedAt: new Date(),
            },
          })
        },
      }),
    )

    const uniqueSuggestions = [
      ...new Map(
        suggestions.map((suggestion) => [suggestion.domain.toLowerCase(), suggestion]),
      ).values(),
    ]

    return prisma.idea.update({
      where: { id: idea.id },
      data: {
        nameSearchStatus: uniqueSuggestions.length > 0 ? "Completed" : "Failed",
        nameSearchError: uniqueSuggestions.length > 0 ? null : "No available .com names found yet.",
        nameSearchUpdatedAt: new Date(),
        nameSearchLastDomain: null,
        nameSuggestions: {
          create: uniqueSuggestions.map((suggestion, index) => ({
            name: suggestion.name,
            domain: suggestion.domain.toLowerCase(),
            rationale: suggestion.rationale,
            position: index,
          })),
        },
      },
      include: ideaInclude,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Name finder failed"

    return prisma.idea.update({
      where: { id: idea.id },
      data: {
        nameSearchStatus: "Failed",
        nameSearchError: message,
        nameSearchUpdatedAt: new Date(),
        nameSearchLastDomain: null,
      },
      include: ideaInclude,
    })
  }
}
