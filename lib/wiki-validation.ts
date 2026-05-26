import type { NextRequest } from "next/server"

const KIB = 1024

export const WIKI_LIMITS = {
  titleChars: 300,
  tagsChars: 500,
  textBytes: 50 * KIB,
  requestBytes: 120 * KIB,
} as const

export const wikiAuthorSelect = {
  id: true,
  name: true,
  image: true,
  isAgent: true,
} as const

type WikiBodyRecord = Record<string, unknown>
type WikiData = {
  title: string
  links: string
  content: string
  tags: string
}
type WikiPatchData = Partial<WikiData>
type FieldResult = { value: string | undefined } | { response: Response }
type WikiFieldsResult =
  | {
      values: {
        title: string | undefined
        links: string | undefined
        content: string | undefined
        tags: string | undefined
      }
    }
  | { response: Response }

const encoder = new TextEncoder()

function hasField(body: WikiBodyRecord, field: keyof WikiData) {
  return Object.prototype.hasOwnProperty.call(body, field)
}

function errorResponse(error: string, field?: keyof WikiData, hint?: string, status = 400) {
  return Response.json({ error, field, hint }, { status })
}

function byteLength(value: string) {
  return encoder.encode(value).length
}

function readString(
  body: WikiBodyRecord,
  field: keyof WikiData,
  limits: { maxChars?: number; maxBytes?: number },
): FieldResult {
  const value = body[field]
  if (value === undefined || value === null) return { value: undefined }

  if (typeof value !== "string") {
    return {
      response: errorResponse(`${field} must be text`, field, `Send ${field} as a string value.`),
    }
  }

  const trimmed = value.trim()
  if (limits.maxChars && trimmed.length > limits.maxChars) {
    return {
      response: errorResponse(
        `${field} is too long`,
        field,
        `Keep ${field} at ${limits.maxChars} characters or less.`,
      ),
    }
  }

  if (limits.maxBytes && byteLength(trimmed) > limits.maxBytes) {
    return {
      response: errorResponse(
        `${field} is too long`,
        field,
        `Keep ${field} at ${Math.floor(limits.maxBytes / KIB)} KB or less.`,
      ),
    }
  }

  return { value: trimmed }
}

function firstUsefulLine(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
}

function clampTitle(value: string) {
  if (value.length <= WIKI_LIMITS.titleChars) return value
  return `${value.slice(0, WIKI_LIMITS.titleChars - 3)}...`
}

function buildTitle(title: string, links: string, content: string) {
  const candidate =
    title.trim() || firstUsefulLine(links) || firstUsefulLine(content) || "Untitled wiki note"
  return clampTitle(candidate)
}

function readWikiFields(body: WikiBodyRecord): WikiFieldsResult {
  const title = readString(body, "title", { maxChars: WIKI_LIMITS.titleChars })
  if ("response" in title) return title

  const links = readString(body, "links", { maxBytes: WIKI_LIMITS.textBytes })
  if ("response" in links) return links

  const content = readString(body, "content", { maxBytes: WIKI_LIMITS.textBytes })
  if ("response" in content) return content

  const tags = readString(body, "tags", { maxChars: WIKI_LIMITS.tagsChars })
  if ("response" in tags) return tags

  return {
    values: {
      title: title.value,
      links: links.value,
      content: content.value,
      tags: tags.value,
    },
  }
}

export async function readWikiBody(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > WIKI_LIMITS.requestBytes) {
    return {
      response: errorResponse(
        "Wiki entry is too large",
        "content",
        "Keep links and notes under 50 KB each.",
        413,
      ),
    }
  }

  try {
    const body = await req.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {
        response: errorResponse("Invalid JSON", undefined, "Send a JSON object."),
      }
    }

    return { body: body as WikiBodyRecord }
  } catch {
    return {
      response: errorResponse("Invalid JSON", undefined, "Check the request body syntax."),
    }
  }
}

export function normalizeWikiCreate(body: WikiBodyRecord) {
  const fields = readWikiFields(body)
  if ("response" in fields) return fields

  const title = fields.values.title ?? ""
  const links = fields.values.links ?? ""
  const content = fields.values.content ?? ""
  const tags = fields.values.tags ?? ""

  if (!title && !links && !content) {
    return {
      response: errorResponse(
        "Add a title, link, or note",
        "title",
        "Wiki entries need at least one searchable value.",
      ),
    }
  }

  return {
    data: {
      title: buildTitle(title, links, content),
      links,
      content,
      tags,
    },
  }
}

export function normalizeWikiPatch(body: WikiBodyRecord) {
  const fields = readWikiFields(body)
  if ("response" in fields) return fields

  const hasTitle = hasField(body, "title")
  const hasLinks = hasField(body, "links")
  const hasContent = hasField(body, "content")
  const hasTags = hasField(body, "tags")

  if (!hasTitle && !hasLinks && !hasContent && !hasTags) {
    return {
      response: errorResponse(
        "No changes provided",
        undefined,
        "Send one or more of title, links, content, or tags.",
      ),
    }
  }

  const title = fields.values.title ?? ""
  const links = fields.values.links ?? ""
  const content = fields.values.content ?? ""

  if (hasTitle && hasLinks && hasContent && !title && !links && !content) {
    return {
      response: errorResponse(
        "Add a title, link, or note",
        "title",
        "Wiki entries need at least one searchable value.",
      ),
    }
  }

  const data: WikiPatchData = {}
  if (hasTitle) data.title = buildTitle(title, links, content)
  if (hasLinks) data.links = links
  if (hasContent) data.content = content
  if (hasTags) data.tags = fields.values.tags ?? ""

  return { data }
}
