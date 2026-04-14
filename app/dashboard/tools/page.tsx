"use client"

import { DomainSearch } from "@/components/dashboard/domain-search"
import { Globe, Wrench } from "lucide-react"

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-1 text-lg font-bold tracking-tight">Tools</h1>
      <p className="text-muted-foreground mb-8 text-sm">Utilities for your workflow</p>

      <DomainSearch />
    </div>
  )
}
