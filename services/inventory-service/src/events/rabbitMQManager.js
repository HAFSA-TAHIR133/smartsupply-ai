import amqp from "amqplib";
import { newrelicHelper } from "../utils/newrelicHelper.js";

const EXCHANGE_NAME = "shop.events";
const DLX_NAME = "shop.dlx";
const DLQ_NAME = "shop.dead_letters";
const ACTIONS_QUEUE = "shop.actions_queue";

let connection = null;
let channel = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY_MS = 30000;

// Idempotency cache to prevent double-execution of confirmed actions
const processedIdempotencyKeys = new Set();

export async function getRabbitChannel() {
  if (channel) return channel;
  await initRabbitMQManager();
  return channel;
}

export async function initRabbitMQManager() {
  if (isConnecting || channel) return;
  isConnecting = true;

  const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost:5672";

  try {
    console.log(`🔌 Connecting to RabbitMQ at ${amqpUrl.split("@").pop()}...`);
    connection = await amqp.connect(amqpUrl);

    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err.message);
      scheduleReconnect();
    });

    connection.on("close", () => {
      console.warn("⚠️ RabbitMQ connection closed. Reconnecting...");
      scheduleReconnect();
    });

    channel = await connection.createChannel();
    await channel.prefetch(1);

    // 1. Assert Dead-Letter Exchange (DLX) & Dead-Letter Queue (DLQ)
    await channel.assertExchange(DLX_NAME, "topic", { durable: true });
    await channel.assertQueue(DLQ_NAME, { durable: true });
    await channel.bindQueue(DLQ_NAME, DLX_NAME, "#");

    // 2. Assert Main Topic Exchange
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // 3. Assert Durable Actions Queue with DLX configuration
    await channel.assertQueue(ACTIONS_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": DLX_NAME,
        "x-dead-letter-routing-key": "shop.action.failed",
      },
    });

    // Bind relevant routing keys
    await channel.bindQueue(ACTIONS_QUEUE, EXCHANGE_NAME, "agent.action.*");
    await channel.bindQueue(ACTIONS_QUEUE, EXCHANGE_NAME, "chart.*");
    await channel.bindQueue(ACTIONS_QUEUE, EXCHANGE_NAME, "stock.*");

    // 4. Start consumer with manual ACK and idempotency protection
    startActionConsumer(channel);

    // 5. Start DLQ monitor for New Relic alerting
    startDLQMonitor(channel);

    reconnectAttempts = 0;
    isConnecting = false;
    console.log("✅ RabbitMQ Manager initialized with durable topic exchange & DLQ.");
  } catch (error) {
    isConnecting = false;
    console.warn(`⚠️ RabbitMQ init failed (${error.message}). Will retry with backoff.`);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  channel = null;
  connection = null;
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS);
  console.log(`🔄 Scheduling RabbitMQ reconnect in ${delay}ms (attempt #${reconnectAttempts})...`);
  setTimeout(() => {
    initRabbitMQManager().catch((e) => console.warn("Reconnect attempt failed:", e.message));
  }, delay);
}

/**
 * Publishes an event to the shop.events topic exchange.
 */
export async function publishShopEvent(routingKey, message) {
  const ch = await getRabbitChannel();
  if (!ch) {
    console.warn(`⚠️ RabbitMQ unavailable, skipping publish to '${routingKey}'`);
    return false;
  }

  try {
    const payload = Buffer.from(
      JSON.stringify({
        ...message,
        idempotencyKey: message.idempotencyKey || `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
      })
    );

    ch.publish(EXCHANGE_NAME, routingKey, payload, {
      persistent: true,
      contentType: "application/json",
    });

    console.log(`📡 [RabbitMQ Published] ${routingKey} (IdempotencyKey: ${message.idempotencyKey})`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to publish to '${routingKey}':`, err.message);
    newrelicHelper.noticeError(err, { routingKey, idempotencyKey: message.idempotencyKey });
    return false;
  }
}

/**
 * Consumer for confirmed actions & background side-effects.
 */
function startActionConsumer(ch) {
  ch.consume(
    ACTIONS_QUEUE,
    async (msg) => {
      if (!msg) return;

      await newrelicHelper.startBackgroundTransaction("rabbitmq.consume_action", async () => {
        let payload = {};
        try {
          payload = JSON.parse(msg.content.toString());
          const { idempotencyKey, actionType, userId, tenantId } = payload;

          // Check Idempotency Key to prevent double-execution
          if (idempotencyKey && processedIdempotencyKeys.has(idempotencyKey)) {
            console.log(`⚡ [Idempotency Guard] Skipping already processed message: ${idempotencyKey}`);
            ch.ack(msg);
            return;
          }

          console.log(`📥 [Consumer Processing] ${msg.fields.routingKey} for Tenant ${tenantId}`);

          // Track processing
          if (idempotencyKey) {
            processedIdempotencyKeys.add(idempotencyKey);
            // Expire from set after 1 hour to prevent unbounded memory growth
            setTimeout(() => processedIdempotencyKeys.delete(idempotencyKey), 60 * 60 * 1000);
          }

          // Manual ACK upon successful completion
          ch.ack(msg);
        } catch (err) {
          console.error("❌ Error processing RabbitMQ message:", err.message);
          newrelicHelper.noticeError(err, {
            queue: ACTIONS_QUEUE,
            routingKey: msg.fields.routingKey,
            idempotencyKey: payload?.idempotencyKey,
          });
          // Reject and send to Dead-Letter Exchange (requeue = false)
          ch.nack(msg, false, false);
        }
      });
    },
    { noAck: false }
  );
}

/**
 * Monitor for Dead Letter Queue to alert New Relic.
 */
function startDLQMonitor(ch) {
  ch.consume(
    DLQ_NAME,
    (msg) => {
      if (!msg) return;
      try {
        const content = msg.content.toString();
        const headers = msg.properties.headers || {};
        console.error(`💀 [Dead-Letter Alert] Message routed to DLQ:`, content);

        newrelicHelper.recordRabbitMQDLQEvent({
          queue: DLQ_NAME,
          routingKey: msg.fields.routingKey,
          error: headers["x-first-death-reason"] || "Processing failure",
          idempotencyKey: headers["idempotencyKey"] || "unknown",
        });

        ch.ack(msg);
      } catch (e) {
        ch.ack(msg);
      }
    },
    { noAck: false }
  );
}
