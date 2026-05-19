import { NextRequest } from "next/server"
import { requireAgent, isAgentResponse } from "@/lib/agent-auth"
import { TASK_COLUMN_LABELS } from "@/lib/constants"

// Columns are currently a global, hardcoded set (todo / in-progress / done).
// We still expose this so agents can discover valid `--status` ids instead of
// guessing — guessing led to `doing` being written as a columnId, which the
// board (keyed by literal columnId) silently failed to render.
export async function GET(req: NextRequest) {
  const ctx = await requireAgent(req, "tasks:read")
  if (isAgentResponse(ctx)) return ctx

  return Response.json(
    Object.entries(TASK_COLUMN_LABELS).map(([id, label]) => ({ id, label })),
  )
}
