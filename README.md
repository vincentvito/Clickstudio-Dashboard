# Clickstudio Control Center

A project management dashboard for tracking projects, tasks, and daily logs. Built with a modern stack and designed with a clean, Linear-inspired aesthetic.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org) | React framework with App Router |
| [React 19](https://react.dev) | UI library |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [shadcn/ui](https://ui.shadcn.com) | UI components (Radix-based) |
| [Prisma 7](https://www.prisma.io) | Database ORM |
| [PostgreSQL](https://www.postgresql.org) | Database |
| [Better Auth](https://www.better-auth.com) | Authentication |
| [next-intl](https://next-intl.dev) | Internationalization |
| [Lucide React](https://lucide.dev) | Icons |

## Features

- **Project management** -- Create projects with states (Idea, In Build, Live, Paused), brain dumps, and artifact links
- **Kanban board** -- Drag-and-drop task management with To-Do, In Progress, and Done columns
- **Task sections** -- Organize tasks by Product and Marketing
- **Daily log** -- Quick updates with timestamped entries per project
- **Authentication** -- Email/password and Google OAuth via Better Auth
- **Dark/Light mode** -- Theme toggle with system preference detection
- **Responsive** -- Collapsible sidebar, mobile-friendly layout

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

```env
# Auth secret (generate with: openssl rand -base64 32)
SECRET=your-secret-key

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/clickstudio
```

### 3. Database Setup

```bash
npx prisma generate
npx prisma migrate dev
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                    Landing page (hero)
  dashboard/
    layout.tsx                Dashboard shell (sidebar + store)
    page.tsx                  All projects view
    [projectId]/page.tsx      Project detail (kanban + logs)
  auth/login/page.tsx         Login page
  api/auth/[...all]/route.ts  Better Auth API

components/
  dashboard/
    app-sidebar.tsx           Sidebar navigation
    kanban-board.tsx           Kanban with drag-and-drop
    project-card.tsx           Project list item
    project-form-dialog.tsx    Create/edit project
    task-edit-dialog.tsx       Edit task
    daily-log.tsx              Log entries
    confirm-dialog.tsx         Destructive action confirmation
    status-badge.tsx           Project state pill
    theme-toggle.tsx           Dark/light mode
  kanban.tsx                   shadcn kanban board primitives
  brand-mark.tsx               Logo SVG
  ui/                          shadcn/ui components

lib/
  store.tsx        Client-side state (localStorage, migrating to API)
  types.ts         TypeScript interfaces
  constants.ts     App constants and color configs
  format.ts        Date/time formatting utilities
  auth.ts          Better Auth configuration
  prisma.ts        Prisma client singleton

prisma/
  schema.prisma    Database schema (auth + dashboard models)
```

## Database Schema

- **User** -- Better Auth user with projects relation
- **Project** -- title, brainDump, artifactLinks, state (enum), belongs to user
- **Task** -- title, columnId (todo/in-progress/done), section (Product/Marketing), belongs to project
- **LogEntry** -- text, timestamp, belongs to project

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT
