import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const changelog = [
  {
    version: '2.0.0',
    date: '2026-01-31',
    changes: [
      {
        type: 'added' as const,
        items: [
          'Complete v2 rewrite with modern stack',
          'Prisma 7 integration with PostgreSQL',
          'Better Auth with Google OAuth',
          'Internationalization (English & Spanish)',
          'New landing page with features section',
          'Protected dashboard with user sessions',
          'shadcn/ui component library',
          'Yellow primary color theme',
          'Light and dark mode support',
        ],
      },
    ],
  },
]

export default async function ChangelogPage() {
  const t = await getTranslations('Changelog')

  const typeColors = {
    added: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    changed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    fixed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    removed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  const typeLabels = {
    added: t('types.added'),
    changed: t('types.changed'),
    fixed: t('types.fixed'),
    removed: t('types.removed'),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-zinc-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-black/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">
              Clickstudio
            </span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backHome')}
          </Link>
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            {t('description')}
          </p>
        </div>

        <div className="space-y-12">
          {changelog.map((release) => (
            <article
              key={release.version}
              className="relative border-l-2 border-primary/30 pl-8"
            >
              <div className="absolute -left-3 top-0 h-6 w-6 rounded-full border-4 border-white bg-primary dark:border-zinc-900" />

              <header className="mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    v{release.version}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {t('latest')}
                  </span>
                </div>
                <time className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(release.date).toLocaleDateString("en-US", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </header>

              <div className="space-y-6">
                {release.changes.map((change, changeIndex) => (
                  <div key={changeIndex}>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${typeColors[change.type]}`}
                    >
                      {typeLabels[change.type]}
                    </span>
                    <ul className="mt-3 space-y-2">
                      {change.items.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                        >
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400 dark:bg-gray-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-gray-600 dark:text-gray-400">
            {t('moreHistory')}
          </p>
          <Button variant="outline" asChild className="mt-4">
            <a
              href="https://github.com/your-repo/clickstudio-dashboard/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('viewGithub')}
            </a>
          </Button>
        </div>
      </main>
    </div>
  )
}
