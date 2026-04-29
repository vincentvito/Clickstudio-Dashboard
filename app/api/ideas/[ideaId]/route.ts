import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"

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
