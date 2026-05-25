"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, Copy, RefreshCcw, RotateCcw } from "lucide-react"
import { toast } from "sonner"

interface EndpointView {
  id: string
  source: string
  eventSlug: string
  eventType: string
  isActive: boolean
  lastReceivedAt: string | null
  createdAt: string
}

interface DeliveryView {
  id: string
  channel: string
  target: string | null
  status: string
  attempts: number
  lastError: string | null
  deliveredAt: string | null
  createdAt: string
}

interface EventView {
  id: string
  source: string
  eventType: string
  targetAgent: string | null
  externalId: string
  providerMessageId: string | null
  payload: unknown
  status: string
  error: string | null
  receivedAt: string
  handledAt: string | null
  deliveries: DeliveryView[]
}

interface RoutingRuleView {
  id: string
  targetAgent: string | null
  target: string | null
  isActive: boolean
}

interface WebhooksClientProps {
  endpoint: EndpointView | null
  telegramRule: RoutingRuleView | null
  events: EventView[]
  initialSelectedEventId?: string
}

function formatTime(value: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

function formatRelative(value: string | null) {
  if (!value) return "Never"

  const diffSeconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (diffSeconds < 60) return `${diffSeconds}s ago`

  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return `${Math.round(diffHours / 24)}d ago`
}

function getSubject(event: EventView) {
  if (
    event.payload &&
    typeof event.payload === "object" &&
    "message" in event.payload &&
    event.payload.message &&
    typeof event.payload.message === "object" &&
    "subject" in event.payload.message
  ) {
    const subject = event.payload.message.subject
    return typeof subject === "string" && subject ? subject : "(no subject)"
  }

  return "(unknown subject)"
}

function getStatusVariant(status: string) {
  if (["delivered", "handled", "active"].includes(status)) return "default"
  if (["failed", "inactive"].includes(status)) return "destructive"
  return "secondary"
}

function getDeliverySummary(event: EventView) {
  if (event.deliveries.length === 0) return "No deliveries"
  return event.deliveries.map((delivery) => `${delivery.channel}: ${delivery.status}`).join(", ")
}

export function WebhooksClient({
  endpoint: initialEndpoint,
  telegramRule: initialTelegramRule,
  events,
  initialSelectedEventId,
}: WebhooksClientProps) {
  const router = useRouter()
  const [endpoint, setEndpoint] = useState(initialEndpoint)
  const [telegramRule, setTelegramRule] = useState(initialTelegramRule)
  const [telegramTarget, setTelegramTarget] = useState(initialTelegramRule?.target ?? "")
  const [signingSecret, setSigningSecret] = useState<string | null>(null)
  const [creatingEndpoint, setCreatingEndpoint] = useState(false)
  const [regeneratingSecret, setRegeneratingSecret] = useState(false)
  const [routingSaving, setRoutingSaving] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventView | null>(
    events.find((event) => event.id === initialSelectedEventId) ?? null,
  )

  const endpointUrl = "/api/webhooks/postrider/message-received"
  const selectedEventPayload = useMemo(
    () => JSON.stringify(selectedEvent?.payload ?? {}, null, 2),
    [selectedEvent?.payload],
  )

  async function createEndpoint() {
    setCreatingEndpoint(true)
    try {
      const response = await fetch("/api/admin/webhooks/endpoints", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to create endpoint")
        return
      }

      setEndpoint({
        id: data.endpoint.id,
        source: data.endpoint.source,
        eventSlug: data.endpoint.eventSlug,
        eventType: data.endpoint.eventType,
        isActive: data.endpoint.isActive,
        lastReceivedAt: data.endpoint.lastReceivedAt,
        createdAt: data.endpoint.createdAt,
      })
      setTelegramRule({
        id: data.telegramRule.id,
        targetAgent: data.telegramRule.targetAgent,
        target: data.telegramRule.target,
        isActive: data.telegramRule.isActive,
      })
      setTelegramTarget(data.telegramRule.target ?? "")
      setSigningSecret(data.signingSecret)
      router.refresh()
      toast.success("Webhook endpoint created")
    } catch {
      toast.error("Failed to create endpoint")
    } finally {
      setCreatingEndpoint(false)
    }
  }

  async function regenerateSecret() {
    if (!endpoint) return

    setRegeneratingSecret(true)
    try {
      const response = await fetch(
        `/api/admin/webhooks/endpoints/${endpoint.id}/regenerate-secret`,
        { method: "POST" },
      )
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to regenerate secret")
        return
      }

      setSigningSecret(data.signingSecret)
      router.refresh()
      toast.success("Signing secret regenerated")
    } catch {
      toast.error("Failed to regenerate secret")
    } finally {
      setRegeneratingSecret(false)
    }
  }

  async function copyValue(value: string, label: string) {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  }

  async function saveTelegramRouting(enabled = telegramRule?.isActive ?? false) {
    setRoutingSaving(true)
    try {
      const response = await fetch("/api/admin/webhooks/routing/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          targetAgent: telegramRule?.targetAgent ?? "Rolino",
          target: telegramTarget,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error ?? "Failed to update routing")
        return
      }

      setTelegramRule({
        id: data.rule.id,
        targetAgent: data.rule.targetAgent,
        target: data.rule.target,
        isActive: data.rule.isActive,
      })
      setTelegramTarget(data.rule.target ?? "")
      router.refresh()
      toast.success("Routing updated")
    } catch {
      toast.error("Failed to update routing")
    } finally {
      setRoutingSaving(false)
    }
  }

  async function toggleTelegram(enabled: boolean) {
    await saveTelegramRouting(enabled)
  }

  async function retryDelivery(deliveryId: string) {
    const response = await fetch(`/api/admin/agent-event-deliveries/${deliveryId}/retry`, {
      method: "POST",
    })
    const data = await response.json()

    if (!response.ok) {
      toast.error(data.error ?? "Failed to retry delivery")
      return
    }

    setSelectedEvent((event) =>
      event
        ? {
            ...event,
            deliveries: event.deliveries.map((delivery) =>
              delivery.id === deliveryId
                ? { ...delivery, status: "pending", lastError: null }
                : delivery,
            ),
          }
        : event,
    )
    router.refresh()
    toast.success("Delivery retry queued")
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground text-sm">
          Manage Control Center ingress, routing, and event delivery visibility.
        </p>
      </div>

      <Tabs defaultValue="endpoints" className="gap-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="routing">Routing</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>PostRiderAI</CardTitle>
                <CardDescription>message.received webhook endpoint</CardDescription>
              </div>
              <CardAction>
                <Badge variant={endpoint?.isActive ? "default" : "destructive"}>
                  {endpoint?.isActive ? "Active" : "Not configured"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                <span className="text-muted-foreground text-sm">URL</span>
                <code className="bg-muted overflow-x-auto rounded-md px-3 py-2 text-sm">
                  {endpointUrl}
                </code>
                <Button variant="outline" size="sm" onClick={() => copyValue(endpointUrl, "URL")}>
                  <Copy data-icon="inline-start" />
                  Copy
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-center">
                <span className="text-muted-foreground text-sm">Endpoint ID</span>
                <div className="flex flex-col gap-1">
                  <code className="bg-muted overflow-x-auto rounded-md px-3 py-2 text-sm">
                    {endpoint?.id ?? "Create endpoint to generate ID"}
                  </code>
                  <span className="text-muted-foreground text-xs">
                    Send as X-Webhook-Endpoint-Id for indexed endpoint resolution.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!endpoint}
                  onClick={() => endpoint && copyValue(endpoint.id, "Endpoint ID")}
                >
                  <Copy data-icon="inline-start" />
                  Copy
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[140px_1fr] sm:items-center">
                <span className="text-muted-foreground text-sm">Last received</span>
                <span className="text-sm">{formatRelative(endpoint?.lastReceivedAt ?? null)}</span>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Signing secret</span>
                  <span className="text-muted-foreground text-xs">
                    Secrets are shown once after creation or regeneration.
                  </span>
                </div>

                {signingSecret ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Input value={signingSecret} readOnly />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyValue(signingSecret, "Signing secret")}
                    >
                      <Copy data-icon="inline-start" />
                      Copy once
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted rounded-md px-3 py-2 text-sm">Hidden</div>
                )}

                <div className="flex gap-2">
                  {!endpoint && (
                    <Button onClick={createEndpoint} disabled={creatingEndpoint}>
                      <Check data-icon="inline-start" />
                      {creatingEndpoint ? "Creating" : "Create endpoint"}
                    </Button>
                  )}
                  {endpoint && (
                    <Button
                      variant="outline"
                      onClick={regenerateSecret}
                      disabled={regeneratingSecret}
                    >
                      <RefreshCcw data-icon="inline-start" />
                      {regeneratingSecret ? "Regenerating" : "Regenerate"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routing">
          <Card>
            <CardHeader>
              <CardTitle>PostRiderAI Message Routing</CardTitle>
              <CardDescription>When postrider/message.received arrives for Rolino</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 rounded-md border px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={telegramRule?.isActive ?? false}
                      disabled={routingSaving}
                      onChange={(event) => toggleTelegram(event.target.checked)}
                      className="accent-primary size-4"
                    />
                    Telegram
                  </label>
                  <Badge variant={telegramRule?.isActive ? "default" : "secondary"}>
                    {telegramRule?.isActive ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <Input
                      value={telegramTarget}
                      onChange={(event) => setTelegramTarget(event.target.value)}
                      placeholder="Telegram chat ID"
                      disabled={routingSaving}
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave blank only when TELEGRAM_CHAT_ID is configured on the server.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={routingSaving}
                    onClick={() => saveTelegramRouting()}
                  >
                    {routingSaving ? "Saving" : "Save target"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input type="checkbox" disabled className="size-4" />
                  Agent endpoint
                </label>
                <Badge variant="outline">Later</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>Recent PostRiderAI message.received traffic</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Time</th>
                      <th className="px-3 py-2 text-left font-medium">Source</th>
                      <th className="px-3 py-2 text-left font-medium">Event</th>
                      <th className="px-3 py-2 text-left font-medium">Agent</th>
                      <th className="px-3 py-2 text-left font-medium">Subject</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Deliveries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-muted/60 cursor-pointer border-t"
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEvent(event)}
                        onKeyDown={(keyboardEvent) => {
                          if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                            keyboardEvent.preventDefault()
                            setSelectedEvent(event)
                          }
                        }}
                      >
                        <td className="px-3 py-2">{formatRelative(event.receivedAt)}</td>
                        <td className="px-3 py-2">{event.source}</td>
                        <td className="px-3 py-2">{event.eventType}</td>
                        <td className="px-3 py-2">{event.targetAgent ?? "Rolino"}</td>
                        <td className="max-w-[220px] truncate px-3 py-2">{getSubject(event)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(event.status)}>{event.status}</Badge>
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2">
                          {getDeliverySummary(event)}
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td className="text-muted-foreground px-3 py-8 text-center" colSpan={7}>
                          No webhook events received yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.externalId} received {formatTime(selectedEvent?.receivedAt ?? null)}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1 rounded-md border p-3">
                  <span className="text-muted-foreground text-xs">Subject</span>
                  <span className="truncate text-sm font-medium">{getSubject(selectedEvent)}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-md border p-3">
                  <span className="text-muted-foreground text-xs">Message ID</span>
                  <span className="truncate text-sm font-medium">
                    {selectedEvent.providerMessageId ?? "Unknown"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-md border p-3">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <Badge className="w-fit" variant={getStatusVariant(selectedEvent.status)}>
                    {selectedEvent.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Delivery attempts</h3>
                {selectedEvent.deliveries.map((delivery) => (
                  <div key={delivery.id} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{delivery.channel}</span>
                        <span className="text-muted-foreground text-xs">
                          Attempts: {delivery.attempts}
                          {delivery.target ? ` - Target: ${delivery.target}` : ""}
                        </span>
                      </div>
                      <Badge variant={getStatusVariant(delivery.status)}>{delivery.status}</Badge>
                    </div>
                    {delivery.lastError && (
                      <p className="text-muted-foreground text-xs">{delivery.lastError}</p>
                    )}
                    {delivery.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => retryDelivery(delivery.id)}
                      >
                        <RotateCcw data-icon="inline-start" />
                        Retry failed delivery
                      </Button>
                    )}
                  </div>
                ))}
                {selectedEvent.deliveries.length === 0 && (
                  <p className="text-muted-foreground text-sm">No delivery rows were created.</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Payload metadata</h3>
                <pre className="bg-muted max-h-72 overflow-auto rounded-md p-3 text-xs">
                  {selectedEventPayload}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
