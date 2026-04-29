import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"

export async function POST(_req: NextRequest, ctx: { params: Promise<{ ideaId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()

  const { ideaId } = await ctx.params

  const idea = await prisma.idea.findFirst({
    where: { id: ideaId, organizationId: org.organizationId },
  })
  if (!idea) return Response.json({ error: "Not found" }, { status: 404 })
  if (idea.status === "Promoted") {
    return Response.json({ error: "Already promoted" }, { status: 400 })
  }

  // Description carries the polished text; transcript only added back when it adds info.
  const brainDump =
    idea.rawTranscript && idea.rawTranscript !== idea.description
      ? `${idea.description}\n\n---\n\nOriginal capture:\n${idea.rawTranscript}`
      : idea.description

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        title: idea.title,
        brainDump,
        artifactLinks: idea.links,
        state: "Backlog",
        organizationId: org.organizationId,
        userId: org.user.id,
      },
    })
    await tx.projectStateTransition.create({
      data: {
        projectId: created.id,
        fromState: null,
        toState: "Backlog",
        userId: org.user.id,
      },
    })
    await tx.idea.update({
      where: { id: idea.id },
      data: { status: "Promoted", promotedToProjectId: created.id },
    })
    return created
  })

  return Response.json(project, { status: 201 })
}
