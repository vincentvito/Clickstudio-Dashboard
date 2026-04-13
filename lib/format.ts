export function relativeTime(iso: string): string {
  if (!iso) return "—"
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return "—"
    const ms = Date.now() - date.getTime()
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return date.toLocaleDateString()
  } catch {
    return "—"
  }
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return (
      d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
      " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    )
  } catch {
    return "—"
  }
}
