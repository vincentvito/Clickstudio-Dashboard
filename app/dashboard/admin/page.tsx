"use client"

import { useState, useEffect } from "react"
import { authClient, useSession } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  UserPlus,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Crown,
  Loader2,
  Mail,
  X,
  Check,
  KeyRound,
} from "lucide-react"
import Link from "next/link"

const ROLE_CONFIG = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-400" },
  admin: { label: "Admin", icon: ShieldCheck, color: "text-blue-400" },
  member: { label: "Member", icon: Shield, color: "text-muted-foreground" },
}

function getInitial(user: { name?: string | null; email?: string | null }) {
  if (user.name) {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return user.email?.[0]?.toUpperCase() ?? "?"
}

function getDisplayName(user: { name?: string | null; email?: string | null }) {
  return user.name || user.email || "Unknown"
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const activeOrg = authClient.useActiveOrganization()

  const [members, setMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Profile editing
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [savingName, setSavingName] = useState(false)

  // Invite
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [inviting, setInviting] = useState(false)

  // Remove member
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string } | null>(null)

  const org = activeOrg.data
  const currentUserId = session?.user?.id
  const currentMember = members.find((m) => m.userId === currentUserId)
  const isOwnerOrAdmin = currentMember?.role === "owner" || currentMember?.role === "admin"

  async function loadOrgData() {
    if (!org) return
    try {
      const data = await authClient.organization.getFullOrganization({
        query: { organizationId: org.id },
      })
      setMembers(data.data?.members ?? [])
      setInvitations((data.data?.invitations ?? []).filter((i: any) => i.status === "pending"))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrgData()
  }, [org?.id])

  useEffect(() => {
    if (session?.user?.name) {
      setNameValue(session.user.name)
    }
  }, [session?.user?.name])

  async function handleSaveName() {
    if (!nameValue.trim()) return
    setSavingName(true)
    try {
      await authClient.updateUser({ name: nameValue.trim() })
      toast.success("Name updated")
      setEditingName(false)
      loadOrgData()
    } catch {
      toast.error("Failed to update name")
    } finally {
      setSavingName(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: [inviteEmail.trim()],
          role: inviteRole,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Failed to invite")
        return
      }

      const result = data.results?.[0]
      if (result?.status === "sent") {
        toast.success(`Invitation sent to ${inviteEmail.trim()}`)
        setInviteEmail("")
        loadOrgData()
      } else if (result?.status === "already_member") {
        toast.error("This person is already a member")
      } else if (result?.status === "already_invited") {
        toast.error("This person already has a pending invitation")
      } else {
        toast.error(result?.error ?? "Failed to invite")
      }
    } catch {
      toast.error("Failed to send invitation")
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvitation(invitationId: string) {
    try {
      await authClient.organization.cancelInvitation({ invitationId })
      toast.success("Invitation cancelled")
      loadOrgData()
    } catch {
      toast.error("Failed to cancel invitation")
    }
  }

  async function handleRemoveMember() {
    if (!removingMember || !org) return
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: removingMember.id,
        organizationId: org.id,
      })
      toast.success("Member removed")
      setRemovingMember(null)
      loadOrgData()
    } catch {
      toast.error("Failed to remove member")
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    if (!org) return
    try {
      await authClient.organization.updateMemberRole({
        memberId,
        role: newRole,
        organizationId: org.id,
      })
      toast.success("Role updated")
      loadOrgData()
    } catch {
      toast.error("Failed to update role")
    }
  }

  if (!org || loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-lg font-bold tracking-tight">Admin</h1>
          <p className="text-muted-foreground text-sm">
            Manage members and roles for {org.name}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/admin/agent-tokens">
            <KeyRound className="size-3.5" />
            Agent tokens
          </Link>
        </Button>
      </div>

      {/* Profile */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-semibold">Your profile</h2>
        <div className="border-border/50 flex items-center gap-3 rounded-lg border px-4 py-3">
          <Avatar className="size-10">
            {session?.user?.image && <AvatarImage src={session.user.image} />}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitial(session?.user ?? {})}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName()
                    if (e.key === "Escape") setEditingName(false)
                  }}
                  placeholder="Your name"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="icon-xs" onClick={handleSaveName} disabled={savingName}>
                  {savingName ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setEditingName(false)}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => {
                    setNameValue(session?.user?.name ?? "")
                    setEditingName(true)
                  }}
                  className="text-foreground text-sm font-medium hover:underline"
                >
                  {session?.user?.name || "Add your name"}
                </button>
                <p className="text-muted-foreground text-xs">{session?.user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Invite */}
      {isOwnerOrAdmin && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">Invite member</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="email@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1"
              required
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-24 shrink-0 capitalize"
                >
                  {inviteRole}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setInviteRole("member")}>
                  <Shield className="mr-2 size-3.5" /> Member
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInviteRole("admin")}>
                  <ShieldCheck className="mr-2 size-3.5" /> Admin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="submit" size="sm" className="shrink-0 gap-1.5" disabled={inviting}>
              {inviting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              Invite
            </Button>
          </form>
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold">
            Pending invitations
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              {invitations.length}
            </span>
          </h2>
          <div className="space-y-1">
            {invitations.map((inv: any) => (
              <div
                key={inv.id}
                className="hover:bg-accent/5 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-muted flex size-8 items-center justify-center rounded-full">
                    <Mail className="text-muted-foreground size-3.5" />
                  </div>
                  <div>
                    <span className="text-sm">{inv.email}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {inv.role ?? "member"}
                      </Badge>
                      <span className="text-muted-foreground text-[11px]">
                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {isOwnerOrAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">
          Members
          <span className="text-muted-foreground ml-1.5 text-xs font-normal">{members.length}</span>
        </h2>
        <div className="space-y-1">
          {members.map((m: any) => {
            const role = ROLE_CONFIG[m.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.member
            const RoleIcon = role.icon
            const isCurrentUser = m.userId === currentUserId
            const canManage = isOwnerOrAdmin && !isCurrentUser && m.role !== "owner"
            const displayName = getDisplayName(m.user ?? {})
            const initial = getInitial(m.user ?? {})

            return (
              <div
                key={m.id}
                className="hover:bg-accent/5 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    {m.user?.image && <AvatarImage src={m.user.image} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{displayName}</span>
                      {isCurrentUser && (
                        <span className="text-muted-foreground text-[11px]">(you)</span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">{m.user?.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${role.color}`}
                  >
                    <RoleIcon className="size-3" />
                    {role.label}
                  </span>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {m.role !== "admin" && (
                          <DropdownMenuItem onClick={() => handleUpdateRole(m.id, "admin")}>
                            <ShieldCheck className="mr-2 size-3.5" /> Make admin
                          </DropdownMenuItem>
                        )}
                        {m.role !== "member" && (
                          <DropdownMenuItem onClick={() => handleUpdateRole(m.id, "member")}>
                            <Shield className="mr-2 size-3.5" /> Make member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setRemovingMember({ id: m.id, name: displayName })}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ConfirmDialog
        open={removingMember !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null)
        }}
        title="Remove member"
        description={`Remove ${removingMember?.name} from ${org.name}? They will lose access to all projects.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMember}
      />
    </div>
  )
}
