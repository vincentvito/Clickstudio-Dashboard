-- CreateTable
CREATE TABLE "wiki_entry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "links" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "wiki_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wiki_entry_organizationId_updatedAt_idx" ON "wiki_entry"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "wiki_entry_userId_idx" ON "wiki_entry"("userId");

-- AddForeignKey
ALTER TABLE "wiki_entry" ADD CONSTRAINT "wiki_entry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_entry" ADD CONSTRAINT "wiki_entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
