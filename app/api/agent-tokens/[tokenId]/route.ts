import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { requireOrg, hasPermission, unauthorized, forbidden } from "@/lib/api-auth"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
) {
  const org = await requireOrg()
  if (!org) return unauthorized()
  if (!hasPermission(org.role, "delete")) return forbidden()

  const { tokenId } = await params

  const token = await prisma.agentToken.findFirst({
    where: { id: tokenId, organizationId: org.organizationId },
  })
  if (!token) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Soft revoke — keep the row so audit trail (lastUsedAt, attribution) survives.
  // The synthetic agent user remains so historical task assignments still resolve.
  const updated = await prisma.agentToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  })

  return Response.json({ id: updated.id, revokedAt: updated.revokedAt })
}
