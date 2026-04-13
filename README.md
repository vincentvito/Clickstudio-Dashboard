# Next.js Starter Template

A production-ready Next.js starter template with authentication, database, and internationalization pre-configured.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org) | 16.1.6 | React framework with App Router |
| [React](https://react.dev) | 19.2.3 | UI library |
| [TypeScript](https://www.typescriptlang.org) | 5.x | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Styling |
| [Prisma](https://www.prisma.io) | 7.3.0 | Database ORM |
| [Better Auth](https://www.better-auth.com) | 1.4.18 | Authentication |
| [next-intl](https://next-intl.dev) | 4.8.1 | Internationalization |
| [shadcn/ui](https://ui.shadcn.com) | - | UI components (Radix UI based) |
| [Lucide React](https://lucide.dev) | 0.563.0 | Icons |

## Features

- **Authentication** - Email/password and Google OAuth via Better Auth
- **Database** - PostgreSQL with Prisma ORM (includes User, Session, Account, Verification models)
- **Internationalization** - Multi-language support with next-intl (English and Spanish included)
- **UI Components** - Button and Avatar components from shadcn/ui
- **Styling** - Tailwind CSS v4 with dark mode support
- **Type Safety** - Full TypeScript configuration

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nextjs-starter-template
npm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Auth secret (generate with: openssl rand -base64 32)
SECRET=your-secret-key

# Google OAuth (optional - get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# PostgreSQL database URL
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
├── app/
│   ├── api/auth/[...all]/    # Better Auth API routes
│   ├── auth/                  # Auth pages (login, etc.)
│   ├── dashboard/             # Protected dashboard
│   ├── changelog/             # Changelog page
│   ├── layout.tsx             # Root layout with next-intl provider
│   ├── page.tsx               # Landing page
│   └── globals.css            # Global styles
├── components/
│   ├── ui/                    # shadcn/ui components
│   └── LanguageSwitcher.tsx   # Language toggle component
├── lib/
│   ├── auth.ts                # Better Auth configuration
│   ├── auth-client.ts         # Auth client for frontend
│   ├── prisma.ts              # Prisma client instance
│   ├── utils.ts               # Utility functions (cn)
│   └── generated/prisma/      # Generated Prisma client
├── i18n/
│   └── request.ts             # next-intl configuration
├── messages/
│   ├── en.json                # English translations
│   └── es.json                # Spanish translations
├── prisma/
│   └── schema.prisma          # Database schema
└── public/                    # Static assets
```

## Authentication

This template uses [Better Auth](https://www.better-auth.com) with:

- Email/password authentication (enabled)
- Google OAuth (requires credentials)
- Session management with database storage
- PostgreSQL adapter via Prisma

To add more social providers, update `lib/auth.ts`.

## Internationalization

Languages are managed via JSON files in `/messages`. The current locale is stored in a cookie.

To add a new language:
1. Create `messages/{locale}.json`
2. Update the language switcher component

## Adding UI Components

This template includes shadcn/ui. Add more components with:

```bash
npx shadcn@latest add [component-name]
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Customization

1. Update `app/layout.tsx` metadata with your app name
2. Replace landing page content in `app/page.tsx`
3. Modify translations in `messages/`
4. Add your database models to `prisma/schema.prisma`
5. Configure additional auth providers in `lib/auth.ts`

## Deployment

Deploy on [Vercel](https://vercel.com) or any platform supporting Next.js:

```bash
npm run build
npm run start
```

Remember to set all environment variables in your deployment platform.

## License

MIT
