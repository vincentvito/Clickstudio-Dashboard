export interface DomainAvailability {
  domain: string
  available: boolean
  checkedVia: "rdap" | "dns" | "failed"
  error?: string
}

const DOMAIN_LABEL_MAX = 63

export function normalizeNameToDotCom(name: string) {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")

  const tldMatch = cleaned.match(/\.([a-z]{2,})$/i)
  const tld = tldMatch ? `.${tldMatch[1]}` : ".com"
  const withoutTld = tldMatch ? cleaned.slice(0, -tld.length) : cleaned

  const label = withoutTld
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, DOMAIN_LABEL_MAX)

  return label ? `${label}${tld}` : ""
}

export async function checkDomainAvailability(domain: string): Promise<DomainAvailability> {
  const normalized = normalizeNameToDotCom(domain)

  if (!normalized) {
    return {
      domain: "",
      available: false,
      checkedVia: "failed",
      error: "Invalid domain",
    }
  }

  try {
    const res = await fetch(`https://rdap.org/domain/${normalized}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    })

    if (res.status === 404) {
      return { domain: normalized, available: true, checkedVia: "rdap" }
    }

    if (res.ok || res.status === 301 || res.status === 302) {
      return { domain: normalized, available: false, checkedVia: "rdap" }
    }
  } catch {
    // Fall back to DNS below. DNS is weaker than RDAP because registered domains
    // can exist without A records, so NXDOMAIN is treated as a best-effort signal.
  }

  try {
    const res = await fetch(`https://dns.google/resolve?name=${normalized}&type=NS`, {
      signal: AbortSignal.timeout(5000),
    })
    const data = (await res.json()) as { Status?: number }

    return {
      domain: normalized,
      available: data.Status === 3,
      checkedVia: "dns",
    }
  } catch {
    return {
      domain: normalized,
      available: false,
      checkedVia: "failed",
      error: "Check failed",
    }
  }
}
