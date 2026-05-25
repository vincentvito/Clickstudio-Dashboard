-- CreateTable
CREATE TABLE "webhook_endpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signingSecretHash" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetAgent" TEXT,
    "targetUserId" TEXT,
    "externalId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "agent_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_event_delivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "target" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_event_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_routing_rule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetAgent" TEXT,
    "channel" TEXT NOT NULL,
    "target" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_routing_rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoint_organizationId_source_eventSlug_key" ON "webhook_endpoint"("organizationId", "source", "eventSlug");

-- CreateIndex
CREATE INDEX "webhook_endpoint_source_eventSlug_idx" ON "webhook_endpoint"("source", "eventSlug");

-- CreateIndex
CREATE UNIQUE INDEX "agent_event_organizationId_source_eventType_externalId_key" ON "agent_event"("organizationId", "source", "eventType", "externalId");

-- CreateIndex
CREATE INDEX "agent_event_organizationId_receivedAt_idx" ON "agent_event"("organizationId", "receivedAt");

-- CreateIndex
CREATE INDEX "agent_event_status_idx" ON "agent_event"("status");

-- CreateIndex
CREATE INDEX "agent_event_delivery_eventId_idx" ON "agent_event_delivery"("eventId");

-- CreateIndex
CREATE INDEX "agent_event_delivery_status_idx" ON "agent_event_delivery"("status");

-- CreateIndex
CREATE INDEX "agent_routing_rule_organizationId_source_eventType_idx" ON "agent_routing_rule"("organizationId", "source", "eventType");

-- AddForeignKey
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_event" ADD CONSTRAINT "agent_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_event_delivery" ADD CONSTRAINT "agent_event_delivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "agent_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_routing_rule" ADD CONSTRAINT "agent_routing_rule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
