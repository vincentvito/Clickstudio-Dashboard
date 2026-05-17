import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"
import { normalizeWikiCreate, readWikiBody, wikiAuthorSelect } from "@/lib/wiki-validation"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const entries = await prisma.wikiEntry.findMany({
    where: { organizationId: org.organizationId },
    include: { user: { select: wikiAuthorSelect } },
    orderBy: { updatedAt: "desc" },
  })

  return Response.json(entries)
}

export async function POST(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const parsed = await readWikiBody(req)
  if ("response" in parsed) return parsed.response

  const normalized = normalizeWikiCreate(parsed.body)
  if ("response" in normalized) return normalized.response

  const entry = await prisma.wikiEntry.create({
    data: {
      ...normalized.data,
      organizationId: org.organizationId,
      userId: org.user.id,
    },
    include: { user: { select: wikiAuthorSelect } },
  })

  return Response.json(entry, { status: 201 })
}
