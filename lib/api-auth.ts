import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"

export async function getSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session?.user ?? null
}

export async function requireOrg() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session?.user) return null

  // Try active org from session first
  let organizationId = session.session.activeOrganizationId

  // If no active org, find the user's first membership
  if (!organizationId) {
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true, id: true },
    })
    if (!membership) return null

    return {
      user: session.user,
      organizationId: membership.organizationId,
      role: membership.role,
      memberId: membership.id,
    }
  }

  // Verify user is actually a member of the active org
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId,
    },
    select: { role: true, id: true, organizationId: true },
  })

  if (!membership) return null

  return {
    user: session.user,
    organizationId: membership.organizationId,
    role: membership.role,
    memberId: membership.id,
  }
}

export function hasPermission(role: string, action: "create" | "update" | "delete") {
  // Owner and admin can create/update/delete projects
  // Members cannot
  if (role === "owner" || role === "admin") return true
  return false
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 })
}
