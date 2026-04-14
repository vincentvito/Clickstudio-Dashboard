/**
 * Mention syntax: @[Name](userId)
 * - Name can contain spaces, letters, numbers, hyphens, dots, underscores
 * - userId is typically a cuid
 */
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

export function extractMentionedUserIds(content: string): string[] {
  const ids = new Set<string>()
  let match
  MENTION_REGEX.lastIndex = 0
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    ids.add(match[2])
  }
  return Array.from(ids)
}

export function diffMentions(oldContent: string, newContent: string): string[] {
  const oldIds = new Set(extractMentionedUserIds(oldContent))
  const newIds = extractMentionedUserIds(newContent)
  return newIds.filter((id) => !oldIds.has(id))
}

export interface ParsedMention {
  type: "text" | "mention"
  content: string
  userId?: string
  name?: string
}

/**
 * Convert our storage format `@[Name](userId)` to HTML with mention nodes
 * that Tiptap's Mention extension can parse.
 */
export function mentionTextToHtml(text: string): string {
  if (!text) return ""
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // Convert mentions back (un-escape the brackets in the mention syntax)
  const withMentions = escaped.replace(
    /@\[([^\]]+)\]\(([^)]+)\)/g,
    (_, name, id) => `<span data-type="mention" data-id="${id}" data-label="${name}"></span>`,
  )

  // Preserve newlines as paragraph breaks
  const paragraphs = withMentions
    .split("\n")
    .map((line) => `<p>${line || "<br>"}</p>`)
    .join("")
  return paragraphs
}

export function parseMentions(content: string): ParsedMention[] {
  const parts: ParsedMention[] = []
  let lastIndex = 0
  let match
  MENTION_REGEX.lastIndex = 0

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: content.slice(lastIndex, match.index) })
    }
    parts.push({
      type: "mention",
      content: match[1],
      name: match[1],
      userId: match[2],
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", content: content.slice(lastIndex) })
  }

  return parts
}
