let newrelic = null;

try {
  // Dynamically attempt to access newrelic if available and loaded
  newrelic = await import("newrelic").then((m) => m.default || m).catch(() => null);
} catch (e) {
  newrelic = null;
}

export const newrelicHelper = {
  /**
   * Wraps background jobs / consumers in a New Relic background transaction.
   */
  async startBackgroundTransaction(name, fn) {
    if (newrelic && typeof newrelic.startBackgroundTransaction === "function") {
      return new Promise((resolve, reject) => {
        newrelic.startBackgroundTransaction(name, async () => {
          const tx = typeof newrelic.getTransaction === "function" ? newrelic.getTransaction() : null;
          try {
            const result = await fn();
            resolve(result);
          } catch (err) {
            newrelicHelper.noticeError(err, { transactionName: name });
            reject(err);
          } finally {
            if (tx && typeof tx.end === "function") {
              tx.end();
            }
          }
        });
      });
    }
    // Fallback if New Relic is not active
    return await fn();
  },

  /**
   * Explicitly notices an error in New Relic with context attributes.
   */
  noticeError(error, customAttributes = {}) {
    if (newrelic && typeof newrelic.noticeError === "function") {
      try {
        newrelic.noticeError(error, customAttributes);
      } catch (e) {
        console.warn("Could not record error to New Relic:", e.message);
      }
    }
  },

  /**
   * Records a custom event for agent task executions.
   */
  recordAgentTaskEvent({ actionType, durationMs, success, userId, tenantId, status }) {
    if (newrelic && typeof newrelic.recordCustomEvent === "function") {
      try {
        newrelic.recordCustomEvent("AgentTaskExecution", {
          actionType: String(actionType || "unknown"),
          durationMs: Number(durationMs || 0),
          success: Boolean(success),
          userId: String(userId || "anonymous"),
          tenantId: String(tenantId || "default"),
          status: String(status || "COMPLETED"),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("Could not record custom event to New Relic:", e.message);
      }
    }
  },

  /**
   * Records recall telemetry on the mem0 path.
   */
  recordRecallMetric({ userId, query, resultsCount }) {
    console.log(`🧠 [Memory Recall Telemetry] User: ${userId} | Query: "${query}" | Results: ${resultsCount}`);
    if (newrelic && typeof newrelic.recordCustomEvent === "function") {
      try {
        newrelic.recordCustomEvent("AgentRecallMemory", {
          userId: String(userId || "anonymous"),
          query: String(query || ""),
          resultsCount: Number(resultsCount || 0),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("Could not record recall metric to New Relic:", e.message);
      }
    }
  },

  /**
   * Records RabbitMQ dead-letter events.
   */
  recordRabbitMQDLQEvent({ queue, routingKey, error, idempotencyKey }) {
    if (newrelic && typeof newrelic.recordCustomEvent === "function") {
      try {
        newrelic.recordCustomEvent("RabbitMQDeadLetter", {
          queue: String(queue || ""),
          routingKey: String(routingKey || ""),
          error: String(error || ""),
          idempotencyKey: String(idempotencyKey || ""),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("Could not record DLQ event to New Relic:", e.message);
      }
    }
  },

  /**
   * Records Write Gate executions (demo vs real).
   */
  recordWriteGateEvent({ isDemo, actionType, userId, tenantId }) {
    if (newrelic && typeof newrelic.recordCustomEvent === "function") {
      try {
        newrelic.recordCustomEvent("WriteGateExecution", {
          isDemo: Boolean(isDemo),
          actionType: String(actionType || "write"),
          userId: String(userId || "anonymous"),
          tenantId: String(tenantId || "default"),
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn("Could not record WriteGate event to New Relic:", e.message);
      }
    }
  },
};

export default newrelicHelper;
