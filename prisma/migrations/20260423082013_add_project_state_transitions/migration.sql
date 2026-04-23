-- CreateTable
CREATE TABLE "project_state_transition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromState" "ProjectState",
    "toState" "ProjectState" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "project_state_transition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_state_transition_projectId_at_idx" ON "project_state_transition"("projectId", "at");

-- AddForeignKey
ALTER TABLE "project_state_transition" ADD CONSTRAINT "project_state_transition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_state_transition" ADD CONSTRAINT "project_state_transition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: seed one "creation" transition per existing project so duration
-- queries work on day one. We don't know the true state history, so we record
-- the current state as the initial state — "time since idea" is correct for
-- projects still in Idea; for projects already past Idea, we only know they
-- reached the current state by project.updatedAt, not the exact intermediate
-- timing. New transitions from now on will capture real history.
INSERT INTO "project_state_transition" ("id", "projectId", "fromState", "toState", "at", "userId")
SELECT
  'bf_' || "id",
  "id",
  NULL,
  "state",
  "createdAt",
  "userId"
FROM "project";
