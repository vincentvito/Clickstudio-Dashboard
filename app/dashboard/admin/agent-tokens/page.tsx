"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ArrowLeft,
  Bot,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldOff,
  Sparkles,
} from "lucide-react"

const ALL_SCOPES = [
  { id: "org:read", label: "Read org", orgWide: true },
  { id: "projects:read", label: "Read projects", orgWide: false },
  { id: "projects:write", label: "Write projects", orgWide: false },
  { id: "tasks:read", label: "Read tasks", orgWide: false },
  { id: "tasks:write", label: "Write tasks", orgWide: false },
  { id: "notes:read", label: "Read notes", orgWide: false },
  { id: "notes:write", label: "Write notes", orgWide: false },
  { id: "logs:write", label: "Write logs", orgWide: false },
  { id: "ideas:read", label: "Read ideas", orgWide: true },
  { id: "ideas:write", label: "Write ideas", orgWide: true },
] as const

type AgentTokenRow = {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  projectIds: string[]
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
  createdBy: { id: string; name: string; email: string }
  agentUser: { id: string; name: string }
}

function relativeTime(iso: string | null) {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function AgentTokensPage() {
  const [tokens, setTokens] = useState<AgentTokenRow[]>([])
  const [loading, setLoading] = useState(true)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [scopes, setScopes] = useState<string[]>([
    "org:read",
    "projects:read",
    "tasks:read",
    "tasks:write",
    "notes:read",
    "notes:write",
    "logs:write",
    "ideas:read",
    "ideas:write",
  ])
  const [creating, setCreating] = useState(false)

  // One-time reveal state
  const [revealed, setRevealed] = useState<{ name: string; token: string } | null>(null)

  // Revoke
  const [revokeTarget, setRevokeTarget] = useState<AgentTokenRow | null>(null)
  const [revoking, setRevoking] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/agent-tokens")
      if (!res.ok) throw new Error(await res.text())
      setTokens(await res.json())
    } catch (e) {
      toast.error("Failed to load tokens")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function toggleScope(id: string) {
    setScopes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Token name is required")
      return
    }
    if (scopes.length === 0) {
      toast.error("Select at least one scope")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/agent-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create token")
      }
      const data = await res.json()
      setRevealed({ name: data.name, token: data.token })
      setCreateOpen(false)
      setName("")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create token")
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch(`/api/agent-tokens/${revokeTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`Revoked "${revokeTarget.name}"`)
      setRevokeTarget(null)
      await load()
    } catch (e) {
      toast.error("Failed to revoke token")
    } finally {
      setRevoking(false)
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/admin">
            <ArrowLeft className="size-4" />
            Back to admin
          </Link>
        </Button>
      </div>

      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <KeyRound className="text-primary size-6" />
            Agent tokens
          </h1>
          <p className="text-muted-foreground mt-1.5 max-w-xl text-sm">
            Issue scoped bearer tokens so AI agents and CLIs can act on this organization
            without using a user account. Each token gets its own 🤖 agent identity.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New token
        </Button>
      </header>

      <Separator className="mb-6" />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : tokens.length === 0 ? (
        <div className="border-border/60 bg-muted/30 rounded-xl border border-dashed px-8 py-16 text-center">
          <Bot className="text-muted-foreground mx-auto size-10" />
          <h3 className="mt-4 text-base font-medium">No agent tokens yet</h3>
          <p className="text-muted-foreground mx-auto mt-1.5 max-w-sm text-sm">
            Create a token to give an agent or CLI access to this organization.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-5">
            <Sparkles className="size-4" />
            Create your first token
          </Button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tokens.map((t) => {
            const isRevoked = !!t.revokedAt
            const isExpired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now()
            const isInactive = isRevoked || isExpired
            return (
              <li
                key={t.id}
                className="bg-card hover:border-border group flex items-center gap-4 rounded-xl border border-transparent px-4 py-3.5 transition-colors"
              >
                <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg text-base">
                  🤖
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{t.name}</span>
                    {isRevoked ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Revoked
                      </Badge>
                    ) : isExpired ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Expired
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]">
                      {t.tokenPrefix}…
                    </code>
                    <span>
                      {t.scopes.length} scope{t.scopes.length === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>last used {relativeTime(t.lastUsedAt)}</span>
                    <span>·</span>
                    <span>by {t.createdBy.name || t.createdBy.email}</span>
                  </div>
                </div>
                {!isInactive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => setRevokeTarget(t)}
                  >
                    <ShieldOff className="size-4" />
                    Revoke
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New agent token</DialogTitle>
            <DialogDescription>
              The full token will be shown once after creation. Store it somewhere safe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. claude-local"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                Shown as the agent&apos;s display name (with a 🤖) on tasks and logs.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scopes</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SCOPES.map((s) => {
                  const active = scopes.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleScope(s.id)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="font-medium">{s.label}</div>
                      <code className="text-[10px] opacity-70">{s.id}</code>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="size-4 animate-spin" />}
              Create token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One-time reveal dialog */}
      <Dialog open={!!revealed} onOpenChange={(o) => !o && setRevealed(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Token created — copy it now</DialogTitle>
            <DialogDescription>
              This is the only time the full token will be shown. After closing this dialog you
              will not be able to retrieve it again.
            </DialogDescription>
          </DialogHeader>
          {revealed && (
            <div className="space-y-3 py-2">
              <div className="text-muted-foreground text-xs">
                Agent: <span className="text-foreground font-medium">🤖 {revealed.name}</span>
              </div>
              <div className="bg-muted flex items-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-xs">
                <code className="min-w-0 flex-1 break-all">{revealed.token}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => copy(revealed.token)}
                >
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted/40 rounded-lg border p-3 text-xs">
                <div className="text-muted-foreground mb-1.5">Use it like this:</div>
                <code className="block font-mono">
                  export CLICKSTUDIO_AGENT_TOKEN={revealed.token.slice(0, 14)}…
                  <br />
                  ccctl whoami
                </code>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>I&apos;ve saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name}"?`}
        description="The agent will immediately lose access. Past actions remain attributed to this agent."
        confirmLabel={revoking ? "Revoking…" : "Revoke"}
        onConfirm={handleRevoke}
      />
    </div>
  )
}
