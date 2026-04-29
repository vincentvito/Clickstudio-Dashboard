-- CreateEnum
CREATE TYPE "IdeaSource" AS ENUM ('Text', 'Voice');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('Pending', 'Promoted', 'Archived');

-- CreateTable
CREATE TABLE "idea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "links" TEXT NOT NULL DEFAULT '',
    "rawTranscript" TEXT NOT NULL DEFAULT '',
    "source" "IdeaSource" NOT NULL DEFAULT 'Text',
    "status" "IdeaStatus" NOT NULL DEFAULT 'Pending',
    "promotedToProjectId" TEXT,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idea_promotedToProjectId_key" ON "idea"("promotedToProjectId");

-- CreateIndex
CREATE INDEX "idea_organizationId_status_idx" ON "idea"("organizationId", "status");

-- CreateIndex
CREATE INDEX "idea_userId_idx" ON "idea"("userId");

-- AddForeignKey
ALTER TABLE "idea" ADD CONSTRAINT "idea_promotedToProjectId_fkey" FOREIGN KEY ("promotedToProjectId") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea" ADD CONSTRAINT "idea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea" ADD CONSTRAINT "idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
