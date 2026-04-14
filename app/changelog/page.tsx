import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import { changelog } from "@/lib/changelog"
import { ArrowLeft, Plus, RefreshCw, Wrench, Trash2 } from "lucide-react"

const typeConfig = {
  added: {
    label: "Added",
    icon: Plus,
    classes: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
  changed: {
    label: "Changed",
    icon: RefreshCw,
    classes: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  },
  fixed: {
    label: "Fixed",
    icon: Wrench,
    classes: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  },
  removed: {
    label: "Removed",
    icon: Trash2,
    classes: "bg-red-400/10 text-red-400 border-red-400/20",
  },
}

export default function ChangelogPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Nav */}
      <nav className="border-border/50 bg-background/70 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="text-primary size-6" />
            <span className="text-sm font-bold">Clickstudio</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Home
          </Link>
        </Button>

        <h1 className="mb-1 text-2xl font-bold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground mb-10 text-sm">
          What&apos;s new in Clickstudio Control Center.
        </p>

        <div className="space-y-10">
          {changelog.map((release, i) => (
            <article key={release.version} className="border-border/50 relative border-l pl-6">
              <div className="bg-primary absolute top-1 -left-1 size-2 rounded-full" />

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold">v{release.version}</h2>
                {release.title && (
                  <span className="text-muted-foreground text-sm">— {release.title}</span>
                )}
                {i === 0 && (
                  <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    Latest
                  </span>
                )}
              </div>

              <time className="text-muted-foreground mb-4 block text-xs">
                {new Date(release.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>

              <div className="space-y-4">
                {release.changes.map((change, ci) => {
                  const config = typeConfig[change.type]
                  const Icon = config.icon
                  return (
                    <div key={ci}>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${config.classes}`}
                      >
                        <Icon className="size-3" />
                        {config.label}
                      </span>
                      <ul className="mt-2 space-y-1">
                        {change.items.map((item, ii) => (
                          <li
                            key={ii}
                            className="text-muted-foreground flex items-start gap-2 text-sm"
                          >
                            <span className="bg-muted-foreground/40 mt-1.5 size-1 shrink-0 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
