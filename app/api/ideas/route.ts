import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"
import { extractIdea } from "@/lib/ai/gemini"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const ideas = await prisma.idea.findMany({
    where: { organizationId: org.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      promotedToProject: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return Response.json(ideas)
}

type CreateBody =
  | { kind: "text"; text: string }
  | { kind: "audio"; audioBase64: string; mimeType: string }

export async function POST(req: NextRequest) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "create")) return forbidden()

  const body = (await req.json()) as CreateBody

  if (!body || (body.kind !== "text" && body.kind !== "audio")) {
    return Response.json({ error: "Invalid input" }, { status: 400 })
  }
  if (body.kind === "text" && !body.text?.trim()) {
    return Response.json({ error: "Text is required" }, { status: 400 })
  }
  if (body.kind === "audio" && !body.audioBase64) {
    return Response.json({ error: "Audio is required" }, { status: 400 })
  }

  let extracted
  try {
    extracted = await extractIdea(
      body.kind === "text"
        ? { kind: "text", text: body.text }
        : { kind: "audio", audioBase64: body.audioBase64, mimeType: body.mimeType },
    )
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Extraction failed" },
      { status: 500 },
    )
  }

  const idea = await prisma.idea.create({
    data: {
      title: extracted.title,
      description: extracted.description,
      links: extracted.links.join("\n"),
      rawTranscript: extracted.rawTranscript,
      source: body.kind === "audio" ? "Voice" : "Text",
      organizationId: org.organizationId,
      userId: org.user.id,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      promotedToProject: { select: { id: true, title: true } },
    },
  })

  return Response.json(idea, { status: 201 })
}
