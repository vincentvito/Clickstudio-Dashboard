import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import {
  detectUnknownFields,
  unknownFieldWarnings,
  fieldError,
} from "@/lib/agent-fields"

const USER_SELECT = { id: true, name: true, email: true, image: true, isAgent: true } as const

const IDEA_CREATE_FIELDS = ["title", "description", "links"] as const

const VALID_STATUSES = ["Pending", "Promoted", "Archived"] as const
type IdeaStatus = (typeof VALID_STATUSES)[number]

function isValidStatus(s: unknown): s is IdeaStatus {
  return typeof s === "string" && (VALID_STATUSES as readonly string[]).includes(s)
}

export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "ideas:read")
  if (isAgentResponse(ctx)) return ctx

  const url = new URL(req.url)
  const statusParam = url.searchParams.get("status")
  const limitParam = url.searchParams.get("limit")
  const limit = Math.min(Math.max(parseInt(limitParam ?? "50", 10) || 50, 1), 200)

  const ideas = await prisma.idea.findMany({
    where: {
      organizationId: ctx.organizationId,
      ...(isValidStatus(statusParam) && { status: statusParam }),
    },
    include: {
      user: { select: USER_SELECT },
      promotedToProject: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return Response.json(
    ideas.map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      links: i.links,
      source: i.source,
      status: i.status,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      capturedBy: i.user,
      promotedToProject: i.promotedToProject,
    })),
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireAgent(req, "ideas:write")
  if (isAgentResponse(ctx)) return ctx

  const body = await req.json().catch(() => ({}))
  const unknownFields = detectUnknownFields(body, IDEA_CREATE_FIELDS)
  const title: string = (body.title ?? "").trim()
  const description: string = (body.description ?? "").trim()
  // Accept either an array of links or a newline-separated string.
  const linksInput: unknown = body.links
  let links = ""
  if (Array.isArray(linksInput)) {
    links = linksInput.filter((l) => typeof l === "string" && l.trim()).join("\n")
  } else if (typeof linksInput === "string") {
    links = linksInput
  }

  if (!title) {
    return fieldError("title", "title is required")
  }

  const idea = await prisma.idea.create({
    data: {
      title,
      description,
      links,
      rawTranscript: "",
      source: "Text",
      // Skip the Gemini extraction + name-finder agent entirely — those are
      // UI-driven flows. An agent capturing an idea already has structured input.
      organizationId: ctx.organizationId,
      userId: ctx.agentUserId,
    },
    include: {
      user: { select: USER_SELECT },
    },
  })

  const warnings = unknownFieldWarnings(unknownFields)

  return Response.json(
    {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      links: idea.links,
      source: idea.source,
      status: idea.status,
      createdAt: idea.createdAt,
      capturedBy: idea.user,
      ...(warnings.length > 0 && { warnings }),
    },
    { status: 201 },
  )
}
