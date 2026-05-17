import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import { detectUnknownFields, unknownFieldWarnings } from "@/lib/agent-fields"
import {
  normalizeWikiCreate,
  readWikiBody,
  wikiAuthorSelect,
} from "@/lib/wiki-validation"

const WIKI_CREATE_FIELDS = ["title", "links", "content", "tags"] as const

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

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "wiki:read")
  if (isAgentResponse(ctx)) return ctx

  const url = new URL(req.url)
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? ""
  const limitParam = url.searchParams.get("limit")
  const limit = Math.min(Math.max(parseInt(limitParam ?? "100", 10) || 100, 1), 500)

  const entries = await prisma.wikiEntry.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: wikiAuthorSelect } },
    orderBy: { updatedAt: "desc" },
    take: search ? undefined : limit,
  })

  const filtered = search
    ? entries.filter((e) => {
        const hay = `${e.title}\n${e.links}\n${e.content}\n${e.tags}`.toLowerCase()
        return hay.includes(search)
      }).slice(0, limit)
    : entries

  return Response.json(filtered.map(serialize))
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "wiki:write")
  if (isAgentResponse(ctx)) return ctx

  const parsed = await readWikiBody(req)
  if ("response" in parsed) return parsed.response

  const unknownFields = detectUnknownFields(parsed.body, WIKI_CREATE_FIELDS)

  const normalized = normalizeWikiCreate(parsed.body)
  if ("response" in normalized) return normalized.response

  // Mirror the session-auth POST: the agent's synthetic user owns the entry.
  // Lets the audit trail show the agent name + 🤖 badge in the wiki UI.
  const entry = await prisma.wikiEntry.create({
    data: {
      ...normalized.data,
      organizationId: ctx.organizationId,
      userId: ctx.agentUserId,
    },
    include: { user: { select: wikiAuthorSelect } },
  })

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json(
    {
      ...serialize(entry),
      ...(warnings.length > 0 && { warnings }),
    },
    { status: 201 },
  )
}
