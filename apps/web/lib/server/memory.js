import crypto from "crypto";
import * as neonDb from "./neonDb.js";
import { getDemoDb, getLiveDb, saveDemoDb, saveLiveDb } from "./store.js";

/**
 * Unified, tenant-isolated memory service with Mem0 integration and local DB fallback.
 * Strictly guarantees multi-tenant isolation, user scoping, and token efficiency.
 */
export const memoryService = {
  normalizeUserId(userId) {
    if (!userId) return "user_default";
    return String(userId).trim().toLowerCase();
  },

  normalizeTenantId(tenantId) {
    if (!tenantId) return "default-tenant";
    return String(tenantId).trim();
  },

  /**
   * Save a memory entry scoped strictly to tenant and user.
   */
  async remember(context, { text, category = "GENERAL", metadata = {} }) {
    if (!text || typeof text !== "string" || !text.trim()) return null;
    const cleanText = text.trim().slice(0, 500); // Token efficiency guard
    const userId = this.normalizeUserId(context?.user?.id || context?.user?.userId);
    const tenantId = this.normalizeTenantId(context?.user?.tenantId);
    const isLive = !context?.isDemo;

    // 1. Try Mem0 API if configured
    if (process.env.MEM0_API_KEY) {
      try {
        const mem0Res = await fetch("https://api.mem0.ai/v1/memories/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${process.env.MEM0_API_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: cleanText }],
            user_id: `${tenantId}:${userId}`,
            metadata: {
              tenant_id: tenantId,
              user_id: userId,
              category,
              ...metadata,
            },
          }),
        });
        if (mem0Res.ok) {
          console.log(`🧠 [Mem0 API Remembered] User: ${userId} (Tenant: ${tenantId})`);
        }
      } catch (mem0Err) {
        console.warn("Mem0 API remember error:", mem0Err.message);
      }
    }

    // 2. Persist in Neon DB if in LIVE mode
    if (isLive && neonDb.isNeonConfigured() && neonDb.isValidUuid(tenantId)) {
      try {
        const p = neonDb.getNeonPool();
        if (p) {
          const memoryId = crypto.randomUUID();
          const key = `user:${userId}:${category.toUpperCase()}`;
          await p.query(
            `INSERT INTO agent_memories (id, "tenantId", key, value, category, "isLongTerm", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
             ON CONFLICT DO NOTHING;`,
            [memoryId, tenantId, key, cleanText, category.toUpperCase()]
          );
          return { id: memoryId, tenantId, userId, category, text: cleanText };
        }
      } catch (dbErr) {
        console.warn("Neon memory store error:", dbErr.message);
      }
    }

    // 3. Fallback / Demo Store
    const db = isLive ? getLiveDb() : getDemoDb();
    if (!db.memories) db.memories = {};
    if (!db.memories[tenantId]) db.memories[tenantId] = {};
    if (!db.memories[tenantId][userId]) db.memories[tenantId][userId] = [];

    const userMemories = db.memories[tenantId][userId];
    const exists = userMemories.some(
      (m) => m.text.toLowerCase() === cleanText.toLowerCase() && m.category === category
    );

    if (!exists) {
      const entry = {
        id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tenantId,
        userId,
        category: category.toUpperCase(),
        text: cleanText,
        metadata,
        createdAt: new Date().toISOString(),
      };
      userMemories.unshift(entry);
      // Keep max 50 memories per user to prevent storage bloat
      if (userMemories.length > 50) userMemories.pop();

      if (isLive) saveLiveDb(); else saveDemoDb();
      return entry;
    }

    return null;
  },

  /**
   * Recall relevant memories scoped strictly to tenant and user.
   * Token efficient: bounds results to requested limit (max 5) and filters by relevance.
   */
  async recall(context, { query = "", limit = 5, category = null } = {}) {
    const userId = this.normalizeUserId(context?.user?.id || context?.user?.userId);
    const tenantId = this.normalizeTenantId(context?.user?.tenantId);
    const isLive = !context?.isDemo;
    const maxResults = Math.min(Math.max(1, limit), 5); // Max 5 for token efficiency

    let candidateMemories = [];

    // 1. Try Mem0 API if configured
    if (process.env.MEM0_API_KEY && query.trim()) {
      try {
        const mem0Res = await fetch("https://api.mem0.ai/v1/memories/search/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${process.env.MEM0_API_KEY}`,
          },
          body: JSON.stringify({
            query: query.trim(),
            user_id: `${tenantId}:${userId}`,
            limit: maxResults,
          }),
        });
        if (mem0Res.ok) {
          const data = await mem0Res.json();
          if (Array.isArray(data)) {
            candidateMemories = data.map((d) => d.memory || d.content).filter(Boolean);
          } else if (data?.results && Array.isArray(data.results)) {
            candidateMemories = data.results.map((d) => d.memory || d.content).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn("Mem0 API recall error:", err.message);
      }
    }

    // 2. Query Neon DB if in LIVE mode and no Mem0 results
    if (candidateMemories.length === 0 && isLive && neonDb.isNeonConfigured() && neonDb.isValidUuid(tenantId)) {
      try {
        const p = neonDb.getNeonPool();
        if (p) {
          let sql = `SELECT value, category, "createdAt" FROM agent_memories WHERE "tenantId" = $1 AND key LIKE $2`;
          const params = [tenantId, `user:${userId}:%`];

          if (category) {
            sql += ` AND category = $3`;
            params.push(category.toUpperCase());
          }

          sql += ` ORDER BY "createdAt" DESC LIMIT 20;`;
          const res = await p.query(sql, params);
          candidateMemories = res.rows.map((r) => r.value);
        }
      } catch (dbErr) {
        console.warn("Neon memory recall error:", dbErr.message);
      }
    }

    // 3. Fallback to Local/Demo Memory Store
    if (candidateMemories.length === 0) {
      const db = isLive ? getLiveDb() : getDemoDb();
      const userMemories = db.memories?.[tenantId]?.[userId] || [];
      candidateMemories = userMemories
        .filter((m) => !category || m.category === category.toUpperCase())
        .map((m) => m.text);
    }

    // 4. Token-efficient relevance ranking
    if (!query || !query.trim()) {
      return candidateMemories.slice(0, maxResults);
    }

    const qLower = query.toLowerCase().trim();
    const queryTokens = qLower.split(/[\s,._-]+/).filter((w) => w.length > 2);

    const scored = candidateMemories.map((text) => {
      const tLower = text.toLowerCase();
      let score = 0;
      if (tLower.includes(qLower)) score += 10;
      for (const token of queryTokens) {
        if (tLower.includes(token)) score += 2;
      }
      return { text, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // Return only matches with positive score, or recent ones if none scored
    const topScored = scored.filter((s) => s.score > 0).map((s) => s.text);
    if (topScored.length > 0) {
      return topScored.slice(0, maxResults);
    }

    return candidateMemories.slice(0, maxResults);
  },
};

export default memoryService;
