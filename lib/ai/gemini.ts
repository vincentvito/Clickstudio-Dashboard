import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL = "gemini-3.1-flash-lite-preview"
let genAI: GoogleGenerativeAI | null = null

function getGenAI() {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Gemini is not configured")
  }
  genAI ??= new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  return genAI
}

export interface ExtractedIdea {
  title: string
  description: string
  links: string[]
  rawTranscript: string
}

export type IdeaInput =
  | { kind: "text"; text: string }
  | { kind: "audio"; audioBase64: string; mimeType: string }

const PROMPT = `You are an idea-capture assistant. The user has shared a rough thought — typed or spoken — that they may later turn into a project.

Listen/read carefully and produce a clean, structured JSON object that mirrors what a project board needs:

{
  "title": "short, punchy project name (3-8 words, proper case, no quotes, no trailing period)",
  "description": "1-3 sentence description of the idea — what it is, why it matters. Polish grammar but keep their intent and voice.",
  "links": ["any URLs the user mentioned, exactly as spoken or typed"],
  "rawTranscript": "the full transcript of what was said/written, lightly cleaned of filler words (um, uh, like) but otherwise faithful"
}

Rules:
- Do not invent facts the user did not say.
- If the user did not give a clear name, generate a sensible short title from the topic.
- Write the output in the same language the user used.
- "links" MUST be an array of strings (URLs only). Empty array if none.
- Return ONLY the raw JSON object. No markdown fences. No commentary.`

export async function extractIdea(input: IdeaInput): Promise<ExtractedIdea> {
  const model = getGenAI().getGenerativeModel({ model: MODEL })

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []

  if (input.kind === "audio") {
    parts.push({ inlineData: { data: input.audioBase64, mimeType: input.mimeType } })
    parts.push({ text: PROMPT + "\n\nThe user spoke this idea. Transcribe it and structure it." })
  } else {
    parts.push({ text: PROMPT + "\n\nThe user typed this idea:\n\n" + input.text })
  }

  const result = await model.generateContent(parts)
  const raw = result.response.text().trim()

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim()
  const jsonStr = cleaned.startsWith("{") ? cleaned : (cleaned.match(/\{[\s\S]*\}/) ?? [])[0]
  if (!jsonStr) throw new Error("Gemini returned no JSON object")

  const parsed = JSON.parse(jsonStr) as {
    title?: unknown
    description?: unknown
    links?: unknown
    rawTranscript?: unknown
  }

  const title = String(parsed.title ?? "").trim()
  if (!title) throw new Error("Gemini returned no title")

  const links = Array.isArray(parsed.links)
    ? parsed.links.map((l) => String(l).trim()).filter((l) => l.length > 0)
    : []

  return {
    title,
    description: String(parsed.description ?? "").trim(),
    links,
    rawTranscript: String(parsed.rawTranscript ?? "").trim(),
  }
}
