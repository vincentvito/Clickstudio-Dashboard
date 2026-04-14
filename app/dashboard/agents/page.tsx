"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Megaphone, Hammer, Search, Lock } from "lucide-react"

const AGENTS = [
  {
    id: "genesis",
    name: "Genesis",
    tagline: "Idea shaping & naming",
    description:
      "Describe your idea and Genesis helps shape it, suggests project names, checks domain availability, and riffs on alternatives until you find the one.",
    icon: Sparkles,
    status: "coming_soon" as const,
  },
  {
    id: "marketing",
    name: "Pitch",
    tagline: "Marketing & copy",
    description: "Landing page copy, tagline generation, ad variants, and launch plans.",
    icon: Megaphone,
    status: "planned" as const,
  },
  {
    id: "build",
    name: "Forge",
    tagline: "Build & scaffolding",
    description: "Scaffolds features, generates components, and drafts technical specs.",
    icon: Hammer,
    status: "planned" as const,
  },
  {
    id: "seo",
    name: "Signal",
    tagline: "SEO & discoverability",
    description: "Keyword research, meta copy, schema markup, and on-page audits.",
    icon: Search,
    status: "planned" as const,
  },
]

const STATUS_CONFIG = {
  coming_soon: {
    label: "Coming soon",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  planned: {
    label: "Planned",
    className: "text-muted-foreground",
  },
  available: {
    label: "Available",
    className: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
}

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-lg font-bold tracking-tight">Agents</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        AI assistants for specific parts of your workflow
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AGENTS.map((agent) => {
          const Icon = agent.icon
          const statusConfig = STATUS_CONFIG[agent.status]
          const isAvailable = agent.status === ("available" as string)

          const card = (
            <Card className="group border-border/50 bg-card hover:border-border h-full transition-colors">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between">
                  <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <Badge variant="outline" className={statusConfig.className}>
                    {!isAvailable && <Lock className="mr-1 size-2.5" />}
                    {statusConfig.label}
                  </Badge>
                </div>
                <h3 className="text-foreground mb-0.5 text-sm font-semibold">{agent.name}</h3>
                <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                  {agent.tagline}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">{agent.description}</p>
              </CardContent>
            </Card>
          )

          if (isAvailable) {
            return (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                {card}
              </Link>
            )
          }

          return (
            <div key={agent.id} className="cursor-not-allowed opacity-60">
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
