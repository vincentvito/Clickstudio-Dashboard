import { NextRequest } from "next/server"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"
import { runIdeaNameFinder } from "@/lib/ideas/name-finder-run"

export const maxDuration = 60

export async function POST(_req: NextRequest, ctx: { params: Promise<{ ideaId: string }> }) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "update")) return forbidden()

  const { ideaId } = await ctx.params

  const updated = await runIdeaNameFinder({
    ideaId,
    organizationId: org.organizationId,
  })
  if (!updated) return Response.json({ error: "Not found" }, { status: 404 })

  return Response.json(updated)
}
