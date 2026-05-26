import type { UserSummary } from "@/lib/types"

type DisplayUser = {
  name?: string | null
  email?: string | null
  isAgent?: boolean
}

// Use the explicit codepoint escape rather than a literal emoji so any
// toolchain step that mishandles UTF-8 (editor, bundler, terminal) can't
// turn the prefix into mojibake.
const AGENT_PREFIX = "\u{1F916} "

export function displayName(user: DisplayUser | null | undefined, fallback = "Unknown"): string {
  if (!user) return fallback
  const base = user.name?.trim() || user.email?.split("@")[0] || fallback
  return user.isAgent ? `${AGENT_PREFIX}${base}` : base
}

export function plainName(
  user: Pick<UserSummary, "name" | "email"> | null | undefined,
  fallback = "Unknown",
): string {
  if (!user) return fallback
  return user.name?.trim() || user.email?.split("@")[0] || fallback
}

export function isAgentUser(user: Pick<UserSummary, "isAgent"> | null | undefined): boolean {
  return !!user?.isAgent
}
