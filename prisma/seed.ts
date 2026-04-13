import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../lib/generated/prisma/client"

const OWNER_EMAIL = process.argv[2]

if (!OWNER_EMAIL) {
  console.error("Usage: npm run db:seed <owner-email>")
  console.error("Example: npm run db:seed vlad@clickstudio.com")
  process.exit(1)
}

async function main() {
  const connectionString = process.env.DATABASE_URL ?? ""
  const url = new URL(connectionString)
  const schema = url.searchParams.get("schema") || "public"
  url.searchParams.delete("schema")

  const pool = new Pool({
    connectionString: url.toString(),
    options: `-c search_path=${schema}`,
  })

  const adapter = new PrismaPg(pool, { schema })
  const prisma = new PrismaClient({ adapter })

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
  })

  if (!user) {
    console.error(`User with email "${OWNER_EMAIL}" not found.`)
    console.error("Make sure you've signed in at least once before running the seed.")
    await pool.end()
    process.exit(1)
  }

  // Check if org already exists
  const existingMember = await prisma.member.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  })

  if (existingMember) {
    console.log(`User is already a member of "${existingMember.organization.name}" as ${existingMember.role}.`)
    await pool.end()
    return
  }

  // Create the organization
  const org = await prisma.organization.create({
    data: {
      id: crypto.randomUUID(),
      name: "Click Studio",
      slug: "click-studio",
    },
  })

  // Add user as owner
  await prisma.member.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  })

  console.log(`✓ Created organization "${org.name}" (${org.slug})`)
  console.log(`✓ Added ${user.email} as owner`)
  console.log(`\nYou can now access the dashboard.`)

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
