-- CreateEnum
CREATE TYPE "ProjectState" AS ENUM ('Idea', 'In Build', 'Live', 'Paused');

-- CreateEnum
CREATE TYPE "TaskSection" AS ENUM ('Product', 'Marketing');

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brainDump" TEXT NOT NULL DEFAULT '',
    "artifactLinks" TEXT NOT NULL DEFAULT '',
    "state" "ProjectState" NOT NULL DEFAULT 'Idea',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "columnId" TEXT NOT NULL DEFAULT 'todo',
    "section" "TaskSection" NOT NULL DEFAULT 'Product',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_entry" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "log_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_userId_idx" ON "project"("userId");

-- CreateIndex
CREATE INDEX "task_projectId_idx" ON "task"("projectId");

-- CreateIndex
CREATE INDEX "log_entry_projectId_idx" ON "log_entry"("projectId");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_entry" ADD CONSTRAINT "log_entry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
