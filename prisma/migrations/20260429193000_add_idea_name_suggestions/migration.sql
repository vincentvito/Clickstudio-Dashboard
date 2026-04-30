CREATE TYPE "IdeaNameSearchStatus" AS ENUM ('NotStarted', 'Running', 'Completed', 'Failed');

ALTER TABLE "idea"
  ADD COLUMN "nameSearchStatus" "IdeaNameSearchStatus" NOT NULL DEFAULT 'NotStarted',
  ADD COLUMN "nameSearchError" TEXT,
  ADD COLUMN "nameSearchUpdatedAt" TIMESTAMP(3);

CREATE TABLE "idea_name_suggestion" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "rationale" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "idea_name_suggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idea_name_suggestion_ideaId_domain_key" ON "idea_name_suggestion"("ideaId", "domain");
CREATE INDEX "idea_name_suggestion_ideaId_position_idx" ON "idea_name_suggestion"("ideaId", "position");

ALTER TABLE "idea_name_suggestion"
  ADD CONSTRAINT "idea_name_suggestion_ideaId_fkey"
  FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
