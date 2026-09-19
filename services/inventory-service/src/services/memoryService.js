import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { AgentMemory } from "../db/models/index.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";

/**
 * Unified memory service for the Node.js backend.
 * Provides normalized, user-scoped remember() and recall() with New Relic telemetry.
 */
export const memoryService = {
  normalizeUserId(userId) {
    if (!userId) return "user_default";
    return String(userId).trim().toLowerCase();
  },

  async remember({ userId, tenantId, text, category = "GENERAL", metadata = {} }) {
    const stableUserId = this.normalizeUserId(userId);
    try {
      const memory = await AgentMemory.create({
        id: uuidv4(),
        tenantId,
        key: `user:${stableUserId}:${category}`,
        value: typeof text === "string" ? text : JSON.stringify(text),
        category,
        isLongTerm: true,
      });

      console.log(`🧠 [Memory Stored] User: ${stableUserId} | Tenant: ${tenantId} | Category: ${category}`);
      return memory;
    } catch (error) {
      console.error("❌ memoryService.remember failed:", error.message);
      newrelicHelper.noticeError(error, { userId: stableUserId, tenantId, category });
      throw error;
    }
  },

  async recall({ userId, tenantId, query = "", limit = 10 }) {
    const stableUserId = this.normalizeUserId(userId);
    try {
      const where = {
        tenantId,
        key: { [Op.like]: `user:${stableUserId}:%` },
      };

      if (query && query.trim()) {
        where.value = { [Op.iLike]: `%${query.trim()}%` };
      }

      const memories = await AgentMemory.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: Math.min(limit, 50),
      });

      const results = memories.map((m) => m.value);

      newrelicHelper.recordRecallMetric({
        userId: stableUserId,
        query,
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error("❌ memoryService.recall failed:", error.message);
      newrelicHelper.noticeError(error, { userId: stableUserId, tenantId, query });
      return [];
    }
  },
};

export default memoryService;
