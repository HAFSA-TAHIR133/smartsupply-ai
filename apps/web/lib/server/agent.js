import { storeAdapter, getDemoDb, getLiveDb, saveDemoDb, saveLiveDb } from "./store.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "groq/compound";
const FALLBACK_LLM_MODEL = process.env.FALLBACK_LLM_MODEL || "qwen/qwen3.6-27b";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Executes a call to the configured LLM (Groq / Compound / Fallback)
 */
async function callLLM(systemPrompt, userMessage) {
  if (GROQ_API_KEY) {
    // 1. Try Primary Configured Model (e.g. groq/compound)
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          // Clean possible markdown think tags
          return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        }
      }
    } catch (e) {
      console.warn("Primary LLM call failed, trying fallback model:", e.message);
    }

    // 2. Try Fallback Model (e.g. qwen/qwen3.6-27b or groq/compound-mini)
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: FALLBACK_LLM_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Fallback LLM call failed:", e.message);
    }
  }

  // 3. Fallback to Gemini if configured
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nUser Question:\n${userMessage}` }],
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (e) {
      console.warn("Gemini API call failed:", e.message);
    }
  }

  return null;
}

/**
 * Core agent chat orchestrator with mode-aware execution & HITL detection
 */
export async function executeAgentChat(context, { agentId, message, conversationId }) {
  const startTime = Date.now();
  const lowerMsg = message.toLowerCase();

  // Load current mode's data
  const products = storeAdapter.getProducts(context);
  const leads = storeAdapter.getLeads(context);
  const tasks = storeAdapter.getTasks(context);

  let requiresConfirmation = false;
  let pendingAction = null;
  let toolsUsed = [];
  let answer = "";
  let sources = ["Enterprise Logistics Knowledge Graph", "Warehouse Inventory Master"];

  // -------------------------------------------------------------
  // Tool 1: RESTOCK / INVENTORY WRITE (Requires HITL Confirmation)
  // -------------------------------------------------------------
  if (
    lowerMsg.includes("restock") ||
    lowerMsg.includes("reorder") ||
    lowerMsg.includes("replenish") ||
    (lowerMsg.includes("order") && lowerMsg.includes("unit")) ||
    (lowerMsg.includes("add") && lowerMsg.includes("stock"))
  ) {
    toolsUsed.push("inventory_restock_evaluator");

    // Match product from inventory
    let matchedProduct = null;
    for (const p of products) {
      if (
        lowerMsg.includes(p.name.toLowerCase()) ||
        lowerMsg.includes(p.sku.toLowerCase()) ||
        (p.category && lowerMsg.includes(p.category.toLowerCase()))
      ) {
        matchedProduct = p;
        break;
      }
    }

    if (!matchedProduct) {
      // Pick first low stock or out of stock product as sensible target
      matchedProduct =
        products.find((p) => Number(p.quantity) === 0) ||
        products.find((p) => Number(p.quantity) <= Number(p.reorderPoint)) ||
        products[0];
    }

    // Extract quantity delta if mentioned (e.g. "by 25", "50 units")
    const qtyMatch = message.match(/\b(\d+)\b/);
    const quantityDelta = qtyMatch ? parseInt(qtyMatch[1], 10) : 25;

    if (matchedProduct) {
      requiresConfirmation = true;
      pendingAction = storeAdapter.createPendingAction(context, {
        actionType: "RESTOCK_PRODUCT",
        title: `Restock ${matchedProduct.name}`,
        summary: `Autonomous replenishment recommendation: Add +${quantityDelta} units to SKU ${matchedProduct.sku} (Current: ${matchedProduct.quantity} units, Min: ${matchedProduct.reorderPoint}).`,
        payload: {
          productId: matchedProduct.id,
          sku: matchedProduct.sku,
          productName: matchedProduct.name,
          changeType: "IN",
          quantityDelta,
          reason: `AI autonomous recommendation restock (${context.mode} mode)`,
        },
      });

      answer = `I have formulated a replenishment plan for **${matchedProduct.name}** (**${matchedProduct.sku}**).\n\n- **Current Stock:** ${matchedProduct.quantity} units (Reorder Threshold: ${matchedProduct.reorderPoint})\n- **Proposed Restock:** +${quantityDelta} units\n- **Execution Mode:** \`${context.mode}\`\n\nBecause this operation mutates warehouse records, **Human-In-The-Loop (HITL) authorization is required**. Please review the pending action card below and select **Approve** to execute or **Reject** to cancel.`;
      sources.push("Safety Stock Policy v2.4", `SKU ${matchedProduct.sku} Master Record`);
    }
  }

  // -------------------------------------------------------------
  // Tool 2: DELETE INVENTORY ITEM (Requires HITL Confirmation)
  // -------------------------------------------------------------
  else if (
    lowerMsg.includes("delete product") ||
    lowerMsg.includes("remove sku") ||
    lowerMsg.includes("delete item")
  ) {
    toolsUsed.push("inventory_sku_deleter");
    let matchedProduct = products.find(
      (p) => lowerMsg.includes(p.name.toLowerCase()) || lowerMsg.includes(p.sku.toLowerCase())
    );

    if (matchedProduct) {
      requiresConfirmation = true;
      pendingAction = storeAdapter.createPendingAction(context, {
        actionType: "DELETE_PRODUCT",
        title: `Delete SKU: ${matchedProduct.sku}`,
        summary: `Request to permanently delete product "${matchedProduct.name}" (${matchedProduct.sku}) from inventory.`,
        payload: {
          productId: matchedProduct.id,
          sku: matchedProduct.sku,
          name: matchedProduct.name,
        },
      });

      answer = `⚠️ **Critical Action Notice**: You requested to delete product **${matchedProduct.name}** (**${matchedProduct.sku}**).\n\nThis action requires Human-In-The-Loop confirmation. Click **Approve** below to proceed with deletion in \`${context.mode}\` mode.`;
    }
  }

  // -------------------------------------------------------------
  // Tool 3: QUERY INVENTORY / LOW STOCK STATUS (Read Only)
  // -------------------------------------------------------------
  else if (
    lowerMsg.includes("stock") ||
    lowerMsg.includes("inventory") ||
    lowerMsg.includes("low stock") ||
    lowerMsg.includes("out of stock") ||
    lowerMsg.includes("sku")
  ) {
    toolsUsed.push("warehouse_inventory_scanner");
    const lowStock = products.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint)
    );
    const outOfStock = products.filter((p) => Number(p.quantity) === 0);

    let stockSummary = `Here is the current warehouse status (${context.mode} mode):\n\n`;
    stockSummary += `- **Total Inventory SKUs:** ${products.length}\n`;
    stockSummary += `- **Healthy Stock:** ${products.length - lowStock.length - outOfStock.length} items\n`;
    stockSummary += `- **Low Stock Alerts:** ${lowStock.length} items\n`;
    stockSummary += `- **Out of Stock:** ${outOfStock.length} items\n\n`;

    if (outOfStock.length > 0) {
      stockSummary += `**Urgent Out-of-Stock Items:**\n`;
      outOfStock.forEach((p) => {
        stockSummary += `• **${p.name}** (\`${p.sku}\`) — 0 / min ${p.reorderPoint}\n`;
      });
      stockSummary += `\n`;
    }

    if (lowStock.length > 0) {
      stockSummary += `**Low Stock Alerts:**\n`;
      lowStock.forEach((p) => {
        stockSummary += `• **${p.name}** (\`${p.sku}\`) — ${p.quantity} left (min ${p.reorderPoint})\n`;
      });
    }

    answer = stockSummary;
    sources.push("Warehouse Live Inventory Scanner");
  }

  // -------------------------------------------------------------
  // Tool 4: CRM / PIPELINE STATUS (Read Only)
  // -------------------------------------------------------------
  else if (
    lowerMsg.includes("lead") ||
    lowerMsg.includes("crm") ||
    lowerMsg.includes("deal") ||
    lowerMsg.includes("pipeline") ||
    lowerMsg.includes("customer")
  ) {
    toolsUsed.push("crm_pipeline_aggregator");
    const pipelineTotal = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    const wonTotal = leads
      .filter((l) => l.stage === "Won")
      .reduce((sum, l) => sum + Number(l.value || 0), 0);

    answer = `**CRM Deal Pipeline Summary (${context.mode} mode)**:\n\n- **Total Active Leads:** ${leads.length}\n- **Total Pipeline Value:** $${pipelineTotal.toLocaleString()}\n- **Deals Won:** $${wonTotal.toLocaleString()}\n- **Open Follow-up Tasks:** ${tasks.filter((t) => t.status === "PENDING").length}\n\nTop deals in negotiation include: ${leads
      .slice(0, 3)
      .map((l) => `**${l.title}** ($${Number(l.value).toLocaleString()} - ${l.stage})`)
      .join(", ")}.`;
    sources.push("CRM Negotiation Funnel v1");
  }

  // -------------------------------------------------------------
  // General AI Reasoning with Groq / Compound LLM
  // -------------------------------------------------------------
  if (!answer) {
    const systemPrompt = `You are SmartSupply AI Assistant, an autonomous supply chain and logistics expert.
Current Environment:
- Execution Mode: ${context.mode}
- User: ${context.user.name} (${context.user.email})
- Tenant: ${context.user.tenantName}
- Available Products Count: ${products.length}
- Low Stock Items: ${products.filter((p) => Number(p.quantity) <= Number(p.reorderPoint)).map((p) => p.name).join(", ") || "None"}
- CRM Pipeline: $${leads.reduce((s, l) => s + Number(l.value || 0), 0).toLocaleString()}

Provide concise, highly authoritative supply chain guidance. If proposing changes that write data, clarify that HITL approval will be staged.`;

    const llmResponse = await callLLM(systemPrompt, message);

    if (llmResponse) {
      answer = llmResponse;
      toolsUsed.push("groq_compound_llm_reasoning");
    } else {
      answer = `I have received your request: "${message}".\n\nAll systems are operating in **${context.mode} mode** for **${context.user.tenantName}**. I can analyze warehouse stock levels, recommend restock orders, review customer deal funnels, or draft purchase orders. How can I assist you further?`;
    }
  }

  const executionTimeMs = Date.now() - startTime;

  // Persist conversation messages in the current mode's store
  const db = context.isDemo ? getDemoDb() : getLiveDb();
  if (!db.conversations) db.conversations = [];

  let conv = db.conversations.find((c) => c.id === conversationId);
  if (!conv) {
    conv = {
      id: conversationId || `conv-${Date.now()}`,
      title: message.slice(0, 40) + (message.length > 40 ? "..." : ""),
      agentId: agentId || "supply-chain-agent",
      createdAt: new Date().toISOString(),
      messages: [],
    };
    db.conversations.unshift(conv);
  }

  // Push user message
  conv.messages.push({
    id: `msg-user-${Date.now()}`,
    sender: "USER",
    content: message,
    createdAt: new Date().toISOString(),
  });

  // Push agent message
  conv.messages.push({
    id: `msg-bot-${Date.now()}`,
    sender: "AGENT",
    content: answer,
    sources,
    toolsUsed,
    executionTimeMs,
    requiresConfirmation,
    pendingAction,
    createdAt: new Date().toISOString(),
  });

  if (context.isDemo) {
    saveDemoDb();
  } else {
    saveLiveDb();
  }

  return {
    answer,
    sources,
    toolsUsed,
    executionTimeMs,
    requiresConfirmation,
    pendingAction,
    conversationId: conv.id,
    executionMode: context.mode,
  };
}
