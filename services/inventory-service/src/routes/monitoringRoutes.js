/**
 * @file monitoringRoutes.js
 * @description Dedicated monitoring and observability endpoints.
 *
 * Routes:
 *   GET  /api/v1/monitoring/health        — Detailed health check (DB, RabbitMQ, env)
 *   GET  /api/v1/monitoring/test-error    — Deliberate error for New Relic verification
 *   POST /api/v1/monitoring/test-event    — Fire a custom New Relic event for verification
 */

import { Router } from "express";
import { sequelize } from "../db/index.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// Returns detailed status of dependent services.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/health", async (req, res) => {
  const startTime = Date.now();
  const checks = {};

  // Database connectivity check
  try {
    await sequelize.authenticate();
    checks.database = { status: "ok", latencyMs: Date.now() - startTime };
  } catch (dbErr) {
    checks.database = { status: "error", error: dbErr.message };
  }

  // Environment sanity checks
  checks.env = {
    newRelicLicenseKey: process.env.NEW_RELIC_LICENSE_KEY
      ? `configured (${process.env.NEW_RELIC_LICENSE_KEY.substring(0, 6)}…)`
      : "NOT SET — New Relic agent inactive",
    rabbitMQ: process.env.RABBITMQ_URL ? "configured" : "NOT SET",
    mem0ApiKey: process.env.MEM0_API_KEY ? "configured" : "NOT SET",
    nodeEnv: process.env.NODE_ENV || "development",
  };

  const allHealthy = Object.values(checks).every((c) => {
    if (typeof c === "object" && "status" in c) return c.status === "ok";
    return true;
  });

  return res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    service: "smartsupply-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /test-error
// Triggers a deliberate error, notices it in New Relic, and returns 500.
// Used in end-to-end verification that New Relic error capture is working.
// ─────────────────────────────────────────────────────────────────────────────

router.get("/test-error", (req, res) => {
  const testError = new Error("Deliberate test error for New Relic verification");

  newrelicHelper.noticeError(testError, {
    test: true,
    triggeredBy: req.user?.id || "anonymous",
    endpoint: "/api/v1/monitoring/test-error",
    triggeredAt: new Date().toISOString(),
  });

  return res.status(500).json({
    success: false,
    message: "Deliberate test error triggered and recorded to New Relic.",
    error: testError.message,
    tip: "Check New Relic Errors Inbox for event type 'Error' with test: true.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /test-event
// Fires a custom New Relic event. Body: { eventType, attributes }
// ─────────────────────────────────────────────────────────────────────────────

router.post("/test-event", (req, res) => {
  const { eventType = "TestMonitoringEvent", attributes = {} } = req.body;

  newrelicHelper.recordAgentTaskEvent({
    actionType: eventType,
    durationMs: 0,
    success: true,
    userId: req.user?.id || "anonymous",
    tenantId: req.user?.tenantId || "default",
    status: "TEST",
    ...attributes,
  });

  return res.status(200).json({
    success: true,
    message: `Custom New Relic event '${eventType}' fired.`,
    tip: "Check New Relic Custom Events dashboard for AgentTaskExecution events.",
  });
});

export default router;
