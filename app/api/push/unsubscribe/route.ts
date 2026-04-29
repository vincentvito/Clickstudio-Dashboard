import { NextRequest } from "next/server"
import prisma from "@/lib/prisma"
import { getSessionUser, unauthorized } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return unauthorized()

  const { endpoint } = (await req.json()) as { endpoint?: string }
  if (!endpoint) {
    return Response.json({ error: "endpoint required" }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: user.id },
  })

  return new Response(null, { status: 204 })
}
