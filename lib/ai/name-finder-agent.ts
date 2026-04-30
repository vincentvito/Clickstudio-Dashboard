import { google } from "@ai-sdk/google"
import { Output, ToolLoopAgent, stepCountIs, tool } from "ai"
import { z } from "zod"
import { checkDomainAvailability } from "@/lib/domain/check-domain"

const MODEL = "gemini-3.1-flash-lite-preview"
const MAX_DOMAIN_CHECKS = 10
const TARGET_SUGGESTIONS = 2

const suggestionSchema = z.object({
  name: z.string().min(2),
  domain: z.string().min(4),
  rationale: z.string().min(1).max(180),
})

const outputSchema = z.object({
  suggestions: z
    .array(suggestionSchema)
    .max(TARGET_SUGGESTIONS)
    .describe("Available .com names verified through checkDomain."),
})

export type NameFinderSuggestion = z.infer<typeof suggestionSchema>

interface FindIdeaNamesInput {
  title: string
  description: string
  rawTranscript?: string
  onDomainChecked?: (event: {
    name: string
    domain: string
    available: boolean
    count: number
  }) => void | Promise<void>
}

export async function findIdeaNames(input: FindIdeaNamesInput): Promise<NameFinderSuggestion[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("Gemini is not configured")
  }

  const checked = new Map<
    string,
    { name: string; domain: string; available: boolean; checkedVia: string; error?: string }
  >()

  function fallbackSuggestions() {
    return [...checked.values()]
      .filter((item) => item.available && item.domain)
      .slice(0, TARGET_SUGGESTIONS)
      .map((item) => ({
        name: item.name,
        domain: item.domain,
        rationale: "Available .com found by the name-finder agent.",
      }))
  }

  const agent = new ToolLoopAgent({
    model: google(MODEL),
    stopWhen: stepCountIs(12),
    output: Output.object({
      schema: outputSchema,
      name: "availableNameSuggestions",
      description: "Two available domain-backed name suggestions for an idea.",
    }),
    tools: {
      checkDomain: tool({
        description:
          "Check whether a proposed brand name has an available .com domain. Pass the brand name, not a full URL.",
        inputSchema: z.object({
          name: z.string().min(2).describe("The proposed product or project name."),
        }),
        outputSchema: z.object({
          name: z.string(),
          domain: z.string(),
          available: z.boolean(),
          checkedVia: z.string(),
          error: z.string().optional(),
        }),
        strict: true,
        execute: async ({ name }) => {
          const key = name.trim().toLowerCase()
          const existing = checked.get(key)
          if (existing) return existing

          if (checked.size >= MAX_DOMAIN_CHECKS) {
            const exhausted = {
              name,
              domain: "",
              available: false,
              checkedVia: "budget",
              error: "Domain check budget exhausted",
            }
            checked.set(key, exhausted)
            return exhausted
          }

          const result = await checkDomainAvailability(name.replace(/\.[a-z0-9.-]+$/i, ""))
          const output = {
            name,
            domain: result.domain,
            available: result.available,
            checkedVia: result.checkedVia,
            error: result.error,
          }
          checked.set(key, output)
          await input.onDomainChecked?.({
            name,
            domain: result.domain,
            available: result.available,
            count: checked.size,
          })
          return output
        },
      }),
    },
    instructions: `You are NameFinderAgent for Click Studio.
Your goal is to find ${TARGET_SUGGESTIONS} short, memorable project names with available .com domains.
You must call checkDomain before claiming a domain is available.
Prefer names that are easy to say, easy to spell, and connected to the idea's audience or promise.
Do not suggest names that sound like generic SaaS filler, crypto tokens, or obvious trademark collisions.
Stop once you have ${TARGET_SUGGESTIONS} verified available .com names, or when the tool budget is exhausted.`,
  })

  let result
  try {
    result = await agent.generate({
      prompt: `Idea title: ${input.title}

Description:
${input.description || "(none)"}

Original capture:
${input.rawTranscript || "(none)"}`,
    })
  } catch (e) {
    const fallback = fallbackSuggestions()
    if (fallback.length > 0) return fallback

    if (e instanceof Error && e.message.toLowerCase().includes("no output")) {
      return []
    }

    throw e
  }

  const verifiedAvailable = new Set(
    [...checked.values()].filter((item) => item.available).map((item) => item.domain),
  )

  const outputSuggestions = result.output.suggestions.filter((suggestion) =>
    verifiedAvailable.has(suggestion.domain.toLowerCase()),
  )

  if (outputSuggestions.length > 0) {
    return outputSuggestions.slice(0, TARGET_SUGGESTIONS)
  }

  return fallbackSuggestions()
}
