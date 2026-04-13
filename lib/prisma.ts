import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || ''

  // Extract schema from connection string if present
  const url = new URL(connectionString)
  const schema = url.searchParams.get('schema') || 'public'

  // Remove schema param from URL as pg doesn't understand it
  url.searchParams.delete('schema')

  const pool = new Pool({
    connectionString: url.toString(),
    options: `-c search_path=${schema}`
  })

  const adapter = new PrismaPg(pool, { schema })
  return new PrismaClient({ adapter })
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
