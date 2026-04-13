import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Sparkles,
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Activity,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'

export default async function LandingPage() {
  const t = await getTranslations('Landing')

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      {/* ===== SVG Filters ===== */}
      <svg className="pointer-events-none fixed h-0 w-0" aria-hidden="true">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      {/* ===== Background Atmosphere ===== */}

      {/* Noise texture */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.025] mix-blend-overlay dark:opacity-[0.06]"
        style={{ filter: 'url(#grain)' }}
      />

      {/* Dot grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, oklch(0.52 0.18 265 / 0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Large floating gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[600px] w-[600px] animate-float-1 rounded-full bg-gradient-to-br from-indigo-500/[0.12] to-blue-400/[0.08] blur-[100px] dark:from-indigo-400/[0.2] dark:to-blue-400/[0.12]" />
        <div className="absolute -bottom-48 -left-48 h-[500px] w-[500px] animate-float-2 rounded-full bg-gradient-to-tr from-violet-400/[0.08] to-purple-400/[0.06] blur-[100px] dark:from-violet-400/[0.12] dark:to-purple-400/[0.08]" />
        <div className="absolute top-1/2 left-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 animate-float-3 rounded-full bg-gradient-to-br from-blue-400/[0.06] to-indigo-400/[0.04] blur-[90px] dark:from-blue-400/[0.1] dark:to-indigo-400/[0.06]" />
      </div>

      {/* ===== Navigation ===== */}
      <nav className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center text-primary">
              <BrandMark className="h-8 w-8" />
            </div>
            <span className="text-base font-bold tracking-tight">
              {t('nav.brand')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link href="/dashboard">
                {t('nav.signIn')}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ===== Hero Section ===== */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-5 pt-24 pb-16 sm:px-8">
        {/* Hero gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-500/[0.04] via-transparent to-transparent dark:from-indigo-400/[0.06]" />

        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          {/* Badge */}
          <div className="animate-fade-up relative mb-8 inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/25 bg-primary/[0.07] px-4 py-1.5 shadow-sm">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
            <Sparkles className="relative h-3.5 w-3.5 text-primary" />
            <span className="relative text-xs font-semibold tracking-wide text-primary">
              {t('hero.badge')}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="animate-fade-up font-extrabold tracking-[-0.04em]"
            style={{
              fontSize: 'clamp(3rem, 6vw + 1rem, 6rem)',
              lineHeight: 1.0,
              animationDelay: '100ms',
            }}
          >
            {t('hero.title')}
            <br />
            <span
              className="animate-text-shimmer bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, oklch(0.6 0.2 265), oklch(0.55 0.18 280), oklch(0.7 0.15 250), oklch(0.55 0.18 280), oklch(0.6 0.2 265))',
                WebkitBackgroundClip: 'text',
                backgroundSize: '200% auto',
              }}
            >
              {t('hero.titleHighlight')}
            </span>
          </h1>

          {/* Description */}
          <p
            className="animate-fade-up mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            style={{ animationDelay: '200ms' }}
          >
            {t('hero.description')}
          </p>

          {/* CTA */}
          <div
            className="animate-fade-up mt-10"
            style={{ animationDelay: '300ms' }}
          >
            <Button
              size="lg"
              asChild
              className="shadow-lg shadow-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/40"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('hero.cta')}
              </Link>
            </Button>
          </div>

          {/* Status preview card */}
          <div
            className="animate-fade-up mt-16 w-full max-w-2xl"
            style={{ animationDelay: '450ms' }}
          >
            {/* Glow behind card */}
            <div className="animate-pulse-glow absolute left-1/2 -z-10 h-64 w-[80%] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-violet-500/5 blur-3xl" />

            <div className="bento-card p-6 sm:p-8">
              {/* Card header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {t('hero.card.title')}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  {t('hero.card.status')}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-xl border border-border/50 bg-muted/30 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FolderKanban className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t('hero.card.projects')}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground sm:text-3xl">
                    4
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[10px] font-medium text-emerald-500">
                      2 {t('hero.card.live')}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">
                      /
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      1 {t('hero.card.building')}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/30 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ListChecks className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t('hero.card.tasks')}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground sm:text-3xl">
                    28
                  </div>
                  <div className="mt-1">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: '60%' }} />
                      <div className="h-full bg-sky-500" style={{ width: '25%' }} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/30 p-3 sm:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                    <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t('hero.card.shipped')}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground sm:text-3xl">
                    17
                  </div>
                  <div className="mt-1">
                    <span className="text-[10px] font-medium text-primary">
                      {t('hero.card.thisWeek')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
