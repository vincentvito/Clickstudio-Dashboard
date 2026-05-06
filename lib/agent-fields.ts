// Helpers for agent route hygiene. Two responsibilities:
//   1. Detect fields the caller sent that we don't recognise — these would
//      otherwise be silently dropped, leading to confusing "I told it to set
//      X but it didn't" bug reports. We surface them in `warnings: string[]`
//      on the response. Optional field, ignored by older parsers.
//   2. Shape validation errors so callers know which field is bad. Old shape
//      was `{ error, hint }`; we add `field` so programmatic clients can
//      map errors to specific inputs without parsing the message.

export function detectUnknownFields(
  body: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  if (!body || typeof body !== "object") return []
  return Object.keys(body).filter((k) => !allowed.includes(k))
}

export function unknownFieldWarnings(unknown: string[]): string[] {
  if (unknown.length === 0) return []
  return unknown.map((k) => `Unknown field "${k}" was ignored — check spelling or scope`)
}

export function fieldError(
  field: string,
  message: string,
  hint?: string,
  status = 400,
): Response {
  return Response.json({ error: message, field, ...(hint && { hint }) }, { status })
}
