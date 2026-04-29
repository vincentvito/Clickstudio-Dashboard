-- Rename the "Idea" enum value to "Backlog" on the ProjectState enum.
-- Postgres propagates the rename to all rows of every column using this
-- type, so existing project.state, project_state_transition.fromState,
-- and project_state_transition.toState values flip automatically.
ALTER TYPE "ProjectState" RENAME VALUE 'Idea' TO 'Backlog';

-- Re-state the column default explicitly. Postgres stores defaults as
-- expression strings, so the rename above doesn't always rewrite them.
ALTER TABLE "project" ALTER COLUMN "state" SET DEFAULT 'Backlog';
