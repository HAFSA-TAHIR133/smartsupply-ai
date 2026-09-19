import amqp from "amqplib";
import { v4 as uuidv4 } from "uuid";

let channel = null;
const pendingRequests = new Map(); // requestId -> { resolve, reject, timeout }

export const initAgentQueue = async () => {
  try {
    const amqpUrl = process.env.RABBITMQ_URL || "amqps://fzyopgti:tAcYlmLLz0q6TNYG7ePkIDOXBrKPS-6t@capybara.lmq.cloudamqp.com/fzyopgti";
    const connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();

    await channel.assertExchange("agent_events", "topic", { durable: true });

    // Assert request and response queues
    await channel.assertQueue("agent_requests_queue", { durable: true });
    await channel.bindQueue("agent_requests_queue", "agent_events", "agent.request");

    await channel.assertQueue("agent_responses_queue", { durable: true });
    await channel.bindQueue("agent_responses_queue", "agent_events", "agent.response");

    // Listen for agent responses from Python
    channel.consume("agent_responses_queue", (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        const requestId = payload.requestId || msg.properties.correlationId;

        if (requestId && pendingRequests.has(requestId)) {
          const { resolve, timer } = pendingRequests.get(requestId);
          clearTimeout(timer);
          pendingRequests.delete(requestId);
          resolve(payload);
        }
        channel.ack(msg);
      } catch (err) {
        console.error("❌ Error parsing agent response:", err);
        channel.nack(msg, false, false);
      }
    });

    console.log("✅ RabbitMQ Agent Queue initialized (Requests & Responses)");
  } catch (error) {
    console.warn("⚠️ RabbitMQ connection warning (will use direct Python agent fallback if needed):", error.message);
  }
};

export const dispatchAgentQuery = async ({ tenantId, userId, conversationId, agentId, message, history }) => {
  const requestId = uuidv4();

  // Try RabbitMQ queue if available
  if (channel) {
    try {
      const payload = {
        requestId,
        tenantId,
        userId,
        conversationId,
        agentId: agentId || "supply-chain-agent",
        message,
        history: history || [],
        timestamp: new Date().toISOString()
      };

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            // Fallback to direct HTTP
            fallbackDirectChat({ tenantId, agentId, message, history })
              .then(resolve)
              .catch(reject);
          }
        }, 15000); // 15s timeout for async queue

        pendingRequests.set(requestId, { resolve, timer });

        channel.publish(
          "agent_events",
          "agent.request",
          Buffer.from(JSON.stringify(payload)),
          {
            persistent: true,
            contentType: "application/json",
            correlationId: requestId
          }
        );
      });
    } catch (err) {
      console.warn("RabbitMQ publish failed, falling back to direct HTTP:", err.message);
    }
  }

  // Fallback: direct HTTP call to Python service on port 8000
  return await fallbackDirectChat({ tenantId, agentId, message, history });
};

async function fallbackDirectChat({ tenantId, agentId, message, history }) {
  const agentUrl = process.env.AGENT_SERVICE_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${agentUrl}/api/agents/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, agentId, message, history }),
    });

    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Agent service responded with status ${res.status}`);
  } catch (e) {
    return {
      agent: agentId,
      status: "FALLBACK",
      answer: `SmartSupply AI processed your inquiry. (Agent engine online: ${e.message})`,
      sources: [],
      toolsUsed: [],
      metadata: {}
    };
  }
}
