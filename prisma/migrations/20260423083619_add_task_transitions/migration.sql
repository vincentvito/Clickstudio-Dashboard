-- CreateTable
CREATE TABLE "task_transition" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromColumnId" TEXT,
    "toColumnId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "task_transition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_transition_taskId_at_idx" ON "task_transition"("taskId", "at");

-- AddForeignKey
ALTER TABLE "task_transition" ADD CONSTRAINT "task_transition_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_transition" ADD CONSTRAINT "task_transition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: seed one "creation" transition per existing task at task.createdAt
-- with the current columnId. userId is NULL because tasks have no creator
-- column (only assignees) and we don't want to pick one arbitrarily.
INSERT INTO "task_transition" ("id", "taskId", "fromColumnId", "toColumnId", "at", "userId")
SELECT
  'bf_' || "id",
  "id",
  NULL,
  "columnId",
  "createdAt",
  NULL
FROM "task";
