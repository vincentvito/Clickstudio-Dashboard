-- AlterTable: add isAgent flag to user
ALTER TABLE "user" ADD COLUMN "isAgent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "agent_token" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_token_agentUserId_key" ON "agent_token"("agentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_token_tokenHash_key" ON "agent_token"("tokenHash");

-- CreateIndex
CREATE INDEX "agent_token_organizationId_idx" ON "agent_token"("organizationId");

-- AddForeignKey
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
