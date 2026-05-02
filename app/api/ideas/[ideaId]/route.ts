import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ ideaId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const { ideaId } = await ctx.params
  const body = (await req.json()) as { title?: unknown }
  const title = String(body.title ?? "").trim()

  if (!title) {
    return Response.json({ error: "Title is required" }, { status: 400 })
  }

  const existing = await prisma.idea.findFirst({
    where: { id: ideaId, organizationId: org.organizationId },
    select: { id: true },
  })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.idea.update({
    where: { id: ideaId },
    data: { title },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, isAgent: true } },
      promotedToProject: { select: { id: true, title: true } },
      nameSuggestions: { orderBy: { position: "asc" } },
    },
  })

  return Response.json(updated)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ ideaId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "delete")) return forbidden()

  const { ideaId } = await ctx.params

  const existing = await prisma.idea.findFirst({
    where: { id: ideaId, organizationId: org.organizationId },
    select: { id: true },
  })
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.idea.delete({ where: { id: ideaId } })
  return new Response(null, { status: 204 })
}
