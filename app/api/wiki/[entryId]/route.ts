import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { normalizeWikiPatch, readWikiBody } from "@/lib/wiki-validation"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { entryId } = await params
  const parsed = await readWikiBody(req)
  if ("response" in parsed) return parsed.response

  const normalized = normalizeWikiPatch(parsed.body)
  if ("response" in normalized) return normalized.response

  const updated = await prisma.wikiEntry.updateMany({
    where: { id: entryId, organizationId: org.organizationId },
    data: normalized.data,
  })

  if (updated.count === 0) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const { entryId } = await params
  const deleted = await prisma.wikiEntry.deleteMany({
    where: { id: entryId, organizationId: org.organizationId },
  })

  if (deleted.count === 0) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({ ok: true })
}
