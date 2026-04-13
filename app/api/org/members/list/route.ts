import prisma from "@/lib/prisma"
import { requireOrg, unauthorized } from "@/lib/api-auth"

export async function GET() {
  const org = await requireOrg()
  if (!org) return unauthorized()

  const members = await prisma.member.findMany({
    where: { organizationId: org.organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return Response.json(
    members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
      role: m.role,
    })),
  )
}
