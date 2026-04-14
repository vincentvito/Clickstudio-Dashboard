"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Globe, Loader2, Check, X } from "lucide-react"

interface DomainResult {
  domain: string
  available: boolean
  checking: boolean
  error?: string
}

const EXTENSIONS = [".com", ".io", ".co", ".app", ".dev", ".ai", ".xyz", ".net", ".org"]

async function checkDomain(domain: string): Promise<{ available: boolean; error?: string }> {
  try {
    // RDAP is the public successor to WHOIS -- 404 means not registered
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })

    if (res.status === 404) {
      return { available: true }
    }
    if (res.ok || res.status === 301 || res.status === 302) {
      return { available: false }
    }
    // Some TLDs don't support RDAP yet -- fall back to DNS check
    return checkDomainDns(domain)
  } catch {
    // RDAP failed (CORS, timeout, etc) -- fall back to DNS
    return checkDomainDns(domain)
  }
}

async function checkDomainDns(domain: string): Promise<{ available: boolean; error?: string }> {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=A`)
    const data = await res.json()
    // Status 3 = NXDOMAIN (domain doesn't exist in DNS)
    const available = data.Status === 3
    return { available }
  } catch {
    return { available: false, error: "Check failed" }
  }
}

export function DomainSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<DomainResult[]>([])
  const [searching, setSearching] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    const base = query
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\.[a-z]+$/, "")
    setSearching(true)

    // Initialize all as checking
    const domains = EXTENSIONS.map((ext) => `${base}${ext}`)
    setResults(domains.map((d) => ({ domain: d, available: false, checking: true })))

    // Check each domain and update results as they come in
    await Promise.allSettled(
      domains.map(async (domain, index) => {
        const result = await checkDomain(domain)
        setResults((prev) =>
          prev.map((r, i) =>
            i === index
              ? { ...r, available: result.available, checking: false, error: result.error }
              : r,
          ),
        )
      }),
    )

    setSearching(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Globe className="text-muted-foreground size-4" />
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Domain Search
        </span>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a name (e.g. myapp)"
          className="flex-1"
        />
        <Button type="submit" size="sm" className="shrink-0 gap-1.5" disabled={searching}>
          {searching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Search className="size-3.5" />
          )}
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => (
            <div
              key={r.domain}
              className="hover:bg-accent/5 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {r.checking ? (
                  <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                ) : r.available ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <X className="text-muted-foreground/40 size-3.5" />
                )}
                <span
                  className={`font-mono text-sm ${r.checking ? "text-muted-foreground" : r.available ? "text-foreground" : "text-muted-foreground/60"}`}
                >
                  {r.domain}
                </span>
              </div>
              {r.checking ? (
                <Badge variant="outline" className="text-muted-foreground/50">
                  Checking...
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={
                    r.available
                      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                      : "text-muted-foreground/50"
                  }
                >
                  {r.error ?? (r.available ? "Available" : "Taken")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !searching && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Enter a name to check availability across popular extensions
        </p>
      )}
    </div>
  )
}
