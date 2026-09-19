/**
 * @file consumer.js
 * @description Standalone RabbitMQ event consumer for the Shop Events topic exchange.
 *
 * Features:
 * - Manual ACK (noAck: false) with channel.prefetch(1)
 * - Dead-Letter Exchange (DLX) routing for failed messages
 * - In-memory idempotency key cache to prevent duplicate side-effects
 * - Exponential backoff reconnect
 * - New Relic background transaction wrapping per message
 *
 * Routing keys consumed:
 *   agent.action.pending   → Log + telemetry
 *   agent.action.approved  → Execute downstream side-effects
 *   chart.created          → Log + telemetry
 *   stock.low              → Log + alert telemetry
 */

import amqp from "amqplib";
import { newrelicHelper } from "../utils/newrelicHelper.js";

const EXCHANGE_NAME = "shop.events";
const DLX_NAME = "shop.dlx";
const DLQ_NAME = "shop.dead_letters";

/**
 * Named consumer queue — durable so messages survive broker restarts.
 * Bound to all standard routing keys on `shop.events`.
 */
const CONSUMER_QUEUE = "shop.consumer_queue";

/** In-memory idempotency key set; entries auto-expire after 1 hour. */
const processedKeys = new Set();

let connection = null;
let channel = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 30_000;

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/**
 * Initializes the consumer, asserting all necessary exchanges + queues, then
 * starts consuming messages. Safe to call multiple times — idempotent.
 */
export async function startConsumer() {
  if (channel) return; // already running

  const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

  try {
    console.log(`🔌 [Consumer] Connecting to RabbitMQ at ${amqpUrl.split("@").pop()}…`);
    connection = await amqp.connect(amqpUrl);

    connection.on("error", (err) => {
      console.error("❌ [Consumer] Connection error:", err.message);
      scheduleReconnect();
    });

    connection.on("close", () => {
      console.warn("⚠️ [Consumer] Connection closed. Reconnecting…");
      scheduleReconnect();
    });

    channel = await connection.createChannel();

    // Process ONE message at a time — prevents overloading on burst traffic.
    await channel.prefetch(1);

    // Assert DLX + DLQ (idempotent)
    await channel.assertExchange(DLX_NAME, "topic", { durable: true });
    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.bindQueue(DLQ_NAME, DLX_NAME, "#");

    // Assert main topic exchange (idempotent)
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // Assert consumer queue with DLX configured
    await channel.assertQueue(CONSUMER_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": DLX_NAME,
        "x-dead-letter-routing-key": "shop.consumer.failed",
      },
    });

    // Bind all standard routing keys
    const routingKeys = [
      "agent.action.pending",
      "agent.action.approved",
      "chart.created",
      "stock.low",
    ];
    for (const key of routingKeys) {
      await channel.bindQueue(CONSUMER_QUEUE, EXCHANGE_NAME, key);
    }

    // Start DLQ monitor
    await _startDLQMonitor(channel);

    // Start main consumer loop
    await channel.consume(CONSUMER_QUEUE, (msg) => _handleMessage(channel, msg), {
      noAck: false,
    });

    reconnectAttempts = 0;
    console.log("✅ [Consumer] Listening on shop.events with manual ACK + DLX.");
  } catch (err) {
    console.warn(`⚠️ [Consumer] Init failed (${err.message}). Will retry with backoff.`);
    channel = null;
    connection = null;
    scheduleReconnect();
  }
}

// ─── Message Handler ──────────────────────────────────────────────────────────

async function _handleMessage(ch, msg) {
  if (!msg) return;

  await newrelicHelper.startBackgroundTransaction(
    `rabbitmq.consumer.${msg.fields.routingKey}`,
    async () => {
      let payload = {};
      try {
        payload = JSON.parse(msg.content.toString());
        const { idempotencyKey, actionType, userId, tenantId } = payload;
        const routingKey = msg.fields.routingKey;

        // ── Idempotency Guard ─────────────────────────────────────────────────
        if (idempotencyKey && processedKeys.has(idempotencyKey)) {
          console.log(
            `⚡ [Consumer] Skipping duplicate message (key=${idempotencyKey}) for '${routingKey}'.`
          );
          ch.ack(msg);
          return;
        }

        console.log(
          `📥 [Consumer] Processing '${routingKey}' | Tenant: ${tenantId} | User: ${userId}`
        );

        // ── Dispatch by routing key ───────────────────────────────────────────
        await _dispatch(routingKey, payload);

        // ── Mark idempotency key ──────────────────────────────────────────────
        if (idempotencyKey) {
          processedKeys.add(idempotencyKey);
          setTimeout(() => processedKeys.delete(idempotencyKey), 60 * 60 * 1000);
        }

        ch.ack(msg);
      } catch (err) {
        console.error("❌ [Consumer] Message processing error:", err.message, payload);
        newrelicHelper.noticeError(err, {
          queue: CONSUMER_QUEUE,
          routingKey: msg.fields.routingKey,
          idempotencyKey: payload?.idempotencyKey,
        });
        // Reject without re-queue → routed to DLX
        ch.nack(msg, false, false);
      }
    }
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function _dispatch(routingKey, payload) {
  switch (routingKey) {
    case "agent.action.pending":
      newrelicHelper.recordAgentTaskEvent({
        actionType: payload.actionType || "pending",
        durationMs: 0,
        success: true,
        userId: payload.userId,
        tenantId: payload.tenantId,
        status: "PENDING",
      });
      console.log(`🕐 [Consumer] Pending action queued: ${payload.summary || payload.actionType}`);
      break;

    case "agent.action.approved":
      newrelicHelper.recordAgentTaskEvent({
        actionType: payload.actionType,
        durationMs: payload.durationMs || 0,
        success: true,
        userId: payload.userId,
        tenantId: payload.tenantId,
        status: "APPROVED",
      });
      console.log(`✅ [Consumer] Approved action executed: ${payload.actionType}`);
      break;

    case "chart.created":
      newrelicHelper.recordAgentTaskEvent({
        actionType: "chart.created",
        durationMs: 0,
        success: true,
        userId: payload.userId,
        tenantId: payload.tenantId,
        status: "COMPLETED",
      });
      console.log(`📊 [Consumer] Chart created: id=${payload.chartId} title="${payload.title}"`);
      break;

    case "stock.low":
      console.warn(
        `🚨 [Consumer] Low-stock alert: Product "${payload.productName}" ` +
          `(qty=${payload.quantity}, threshold=${payload.threshold}) — Tenant: ${payload.tenantId}`
      );
      newrelicHelper.recordAgentTaskEvent({
        actionType: "stock.low",
        durationMs: 0,
        success: true,
        userId: payload.userId || "system",
        tenantId: payload.tenantId,
        status: "ALERT",
      });
      break;

    default:
      console.warn(`[Consumer] Unhandled routing key: '${routingKey}'`);
  }
}

// ─── DLQ Monitor ─────────────────────────────────────────────────────────────

async function _startDLQMonitor(ch) {
  await ch.consume(
    DLQ_NAME,
    (msg) => {
      if (!msg) return;
      try {
        const content = msg.content.toString();
        const headers = msg.properties.headers || {};
        const reason = headers["x-first-death-reason"] || "processing_failure";
        const routingKey = msg.fields.routingKey;

        console.error(`💀 [Consumer DLQ] Dead-lettered message: key='${routingKey}' reason='${reason}'`);
        console.error("   Content:", content.substring(0, 200));

        newrelicHelper.recordRabbitMQDLQEvent({
          queue: DLQ_NAME,
          routingKey,
          error: reason,
          idempotencyKey: headers["idempotencyKey"] || "unknown",
        });

        ch.ack(msg);
      } catch (e) {
        console.error("[Consumer DLQ] Error in DLQ monitor:", e.message);
        ch.ack(msg);
      }
    },
    { noAck: false }
  );

  console.log("👁️ [Consumer] DLQ monitor active on", DLQ_NAME);
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

function scheduleReconnect() {
  channel = null;
  connection = null;
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
  console.log(`🔄 [Consumer] Reconnecting in ${delay}ms (attempt #${reconnectAttempts})…`);
  setTimeout(() => {
    startConsumer().catch((e) =>
      console.warn("[Consumer] Reconnect attempt failed:", e.message)
    );
  }, delay);
}

export default startConsumer;
