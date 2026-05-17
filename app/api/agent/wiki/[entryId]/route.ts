import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import { detectUnknownFields, unknownFieldWarnings } from "@/lib/agent-fields"
import {
  normalizeWikiPatch,
  readWikiBody,
  wikiAuthorSelect,
} from "@/lib/wiki-validation"

const WIKI_UPDATE_FIELDS = ["title", "links", "content", "tags"] as const

function serialize(entry: {
  id: string
  title: string
  links: string
  content: string
  tags: string
  createdAt: Date
  updatedAt: Date
  user: { id: string; name: string | null; image: string | null; isAgent: boolean }
}) {
  return {
    id: entry.id,
    title: entry.title,
    links: entry.links,
    content: entry.content,
    tags: entry.tags,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    author: entry.user,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const ctx = await requireAgent(req, "wiki:read")
  if (isAgentResponse(ctx)) return ctx

  const { entryId } = await params

  const entry = await prisma.wikiEntry.findFirst({
    where: { id: entryId, organizationId: ctx.organizationId },
    include: { user: { select: wikiAuthorSelect } },
  })

  if (!entry) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(serialize(entry))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const ctx = await requireAgent(req, "wiki:write")
  if (isAgentResponse(ctx)) return ctx

  const { entryId } = await params

  const parsed = await readWikiBody(req)
  if ("response" in parsed) return parsed.response

  const unknownFields = detectUnknownFields(parsed.body, WIKI_UPDATE_FIELDS)

  const normalized = normalizeWikiPatch(parsed.body)
  if ("response" in normalized) return normalized.response

  const updated = await prisma.wikiEntry.updateMany({
    where: { id: entryId, organizationId: ctx.organizationId },
    data: normalized.data,
  })

  if (updated.count === 0) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const entry = await prisma.wikiEntry.findFirst({
    where: { id: entryId, organizationId: ctx.organizationId },
    include: { user: { select: wikiAuthorSelect } },
  })

  if (!entry) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json({
    ...serialize(entry),
    ...(warnings.length > 0 && { warnings }),
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const ctx = await requireAgent(req, "wiki:write")
  if (isAgentResponse(ctx)) return ctx

  const { entryId } = await params

  const existing = await prisma.wikiEntry.findFirst({
    where: { id: entryId, organizationId: ctx.organizationId },
    select: { id: true, title: true },
  })

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.wikiEntry.delete({ where: { id: existing.id } })

  return Response.json({ ok: true, id: existing.id, title: existing.title })
}
