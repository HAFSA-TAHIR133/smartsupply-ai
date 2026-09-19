import "./env.js";
import { storeAdapter, getDemoDb, saveDemoDb } from "./store.js";
import * as neonDb from "./neonDb.js";

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

// Helper: match product from message text
function matchProductFromText(text, products) {
  if (!products || products.length === 0) return null;
  const lower = text.toLowerCase();

  // 1. Try exact or partial SKU match
  for (const p of products) {
    if (p.sku && lower.includes(p.sku.toLowerCase())) return p;
  }

  // 2. Try product name match
  for (const p of products) {
    if (p.name && lower.includes(p.name.toLowerCase())) return p;
  }

  // 3. Try name tokens (e.g. "gateway", "iot", "sensor", "bolts", "motor", "plate")
  for (const p of products) {
    const tokens = p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      if (lower.includes(token)) return p;
    }
  }

  // 4. Only match generic references if user explicitly says "it" or "this product"
  if (
    lower.includes(" it ") ||
    lower.endsWith(" it") ||
    lower.includes("this product") ||
    lower.includes("this item")
  ) {
    return products[0];
  }

  // Do NOT randomly fall back to other products
  return null;
}

// Helper: check if message is a question or inquiry (read-only)
function isQuestionOrInquiry(lowerMsg) {
  return (
    lowerMsg.includes("which") ||
    lowerMsg.includes("what") ||
    lowerMsg.includes("how many") ||
    lowerMsg.includes("how much") ||
    lowerMsg.includes("show") ||
    lowerMsg.includes("list") ||
    lowerMsg.includes("tell me") ||
    lowerMsg.includes("check") ||
    lowerMsg.includes("status") ||
    lowerMsg.includes("is there") ||
    lowerMsg.includes("are there") ||
    lowerMsg.includes("overview") ||
    lowerMsg.includes("report") ||
    lowerMsg.endsWith("?") ||
    lowerMsg.startsWith("can you show") ||
    lowerMsg.startsWith("can you tell")
  );
}

// Helper: match lead from message text
function matchLeadFromText(text, leads) {
  if (!leads || leads.length === 0) return null;
  const lower = text.toLowerCase();
  for (const l of leads) {
    if (l.title && lower.includes(l.title.toLowerCase())) return l;
    if (l.companyName && lower.includes(l.companyName.toLowerCase())) return l;
  }
  return leads[0];
}

// Helper: match task from message text
function matchTaskFromText(text, tasks) {
  if (!tasks || tasks.length === 0) return null;
  const lower = text.toLowerCase();
  for (const t of tasks) {
    if (t.title && lower.includes(t.title.toLowerCase())) return t;
  }
  return tasks[0];
}

/**
 * Core agent chat orchestrator with mode-aware execution & HITL detection
 */
export async function executeAgentChat(context, { agentId, message, conversationId }) {
  const startTime = Date.now();
  const lowerMsg = message.toLowerCase();

  // Load current mode's data
  const products = await storeAdapter.getProducts(context);
  const leads = await storeAdapter.getLeads(context);
  const tasks = await storeAdapter.getTasks(context);

  let requiresConfirmation = false;
  let pendingAction = null;
  let toolsUsed = [];
  let answer = "";
  let sources = [];

  const isQuery = isQuestionOrInquiry(lowerMsg);

  // -------------------------------------------------------------
  // QUERY A: LOW STOCK & OUT OF STOCK STATUS (Read Only)
  // -------------------------------------------------------------
  const isLowStockQuery =
    lowerMsg.includes("low stock") ||
    lowerMsg.includes("out of stock") ||
    (lowerMsg.includes("low") && lowerMsg.includes("stock")) ||
    (isQuery && lowerMsg.includes("stock")) ||
    (lowerMsg.includes("which") && lowerMsg.includes("product")) ||
    (isQuery && (lowerMsg.includes("reorder") || lowerMsg.includes("restock")));

  if (isLowStockQuery && (lowerMsg.includes("low") || lowerMsg.includes("out") || lowerMsg.includes("which") || lowerMsg.includes("need"))) {
    toolsUsed.push("warehouse_inventory_scanner");

    const lowStock = products.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint)
    );
    const outOfStock = products.filter((p) => Number(p.quantity) === 0);

    if (outOfStock.length === 0 && lowStock.length === 0) {
      answer = "All products currently have healthy stock levels above their minimum reorder thresholds.";
    } else {
      let text = "Here are the products currently on low or out of stock:\n\n";
      if (outOfStock.length > 0) {
        text += "**Out of Stock (0 units):**\n";
        outOfStock.forEach((p) => {
          text += `• **${p.name}** (\`${p.sku}\`) — 0 in stock (Min threshold: ${p.reorderPoint})\n`;
        });
        text += "\n";
      }
      if (lowStock.length > 0) {
        text += "**Low Stock Items:**\n";
        lowStock.forEach((p) => {
          text += `• **${p.name}** (\`${p.sku}\`) — ${p.quantity} units left (Min threshold: ${p.reorderPoint})\n`;
        });
      }
      answer = text.trim();
    }
  }

  // -------------------------------------------------------------
  // OPERATION 1: RENEW STOCK / RESTOCK / REPLENISH (Requires Human Confirmation)
  // Only triggers on explicit command, NOT on questions/inquiries
  // -------------------------------------------------------------
  else if (
    !isQuery &&
    (
      lowerMsg.includes("renew stock") ||
      lowerMsg.includes("renew the stock") ||
      lowerMsg.startsWith("restock") ||
      lowerMsg.includes("restock ") ||
      lowerMsg.includes("replenish") ||
      lowerMsg.includes("reorder") ||
      lowerMsg.startsWith("order ") ||
      lowerMsg.includes("order +") ||
      (lowerMsg.includes("order") && (lowerMsg.includes("unit") || lowerMsg.includes("item") || lowerMsg.includes("more") || lowerMsg.includes("stock"))) ||
      (lowerMsg.includes("add") && (lowerMsg.includes("stock") || lowerMsg.includes("unit") || lowerMsg.includes("qty")))
    )
  ) {
    toolsUsed.push("inventory_restock_evaluator");

    const matchedProduct = matchProductFromText(message, products);

    if (!matchedProduct) {
      answer = "Which product would you like to restock? Please specify the product name or SKU.";
    } else {
      // Extract quantity delta cleanly from user message
      const specificQty =
        message.match(/(?:by|add|with|order|\+)\s*(\d+)/i) ||
        message.match(/(\d+)\s*(?:units?|pcs?|pieces?|items?|qty|more|new)/i) ||
        message.replace(/\bv\d+\b/gi, "").match(/\b(\d+)\b/);

      if (!specificQty) {
        answer = `How many units of **${matchedProduct.name}** would you like to restock? Please specify the quantity you want to add.`;
      } else {
        const quantityDelta = parseInt(specificQty[1], 10);
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "RESTOCK_PRODUCT",
          title: `Renew Stock: ${matchedProduct.name}`,
          summary: `Add +${quantityDelta} units to ${matchedProduct.name} (${matchedProduct.sku}). Current stock: ${matchedProduct.quantity} units (Min threshold: ${matchedProduct.reorderPoint}).`,
          payload: {
            productId: matchedProduct.id,
            sku: matchedProduct.sku,
            productName: matchedProduct.name,
            changeType: "IN",
            quantityDelta,
            reason: `Restock operation requested via AI Assistant`,
          },
        });

        answer = `I have prepared the request to renew the stock of **${matchedProduct.name}** (**${matchedProduct.sku}**) by **+${quantityDelta} units** (current stock: ${matchedProduct.quantity} units).\n\nPlease confirm below before I proceed.`;
      }
    }
  }

  // -------------------------------------------------------------
  // OPERATION 2: DELETE ITEM / LEAD / TASK (Requires Human Confirmation)
  // -------------------------------------------------------------
  else if (
    !isQuery &&
    (
      lowerMsg.includes("delete") ||
      lowerMsg.includes("remove") ||
      lowerMsg.includes("erase") ||
      lowerMsg.includes("drop")
    )
  ) {
    // Check if targeting a CRM Lead
    if (lowerMsg.includes("lead") || lowerMsg.includes("deal")) {
      toolsUsed.push("crm_lead_deleter");
      const matchedLead = matchLeadFromText(message, leads);
      if (matchedLead) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_LEAD",
          title: `Delete Lead: ${matchedLead.title}`,
          summary: `Permanently delete lead "${matchedLead.title}" (Value: $${Number(matchedLead.value || 0).toLocaleString()}).`,
          payload: {
            leadId: matchedLead.id,
            leadTitle: matchedLead.title,
          },
        });
        answer = `I have prepared the request to delete lead **${matchedLead.title}**.\n\nPlease confirm below before I permanently remove it.`;
      } else {
        answer = "Which lead would you like to delete? Please specify the lead title.";
      }
    }
    // Check if targeting a Task
    else if (lowerMsg.includes("task")) {
      toolsUsed.push("crm_task_deleter");
      const matchedTask = matchTaskFromText(message, tasks);
      if (matchedTask) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_TASK",
          title: `Delete Task: ${matchedTask.title}`,
          summary: `Permanently delete task "${matchedTask.title}".`,
          payload: {
            taskId: matchedTask.id,
            taskTitle: matchedTask.title,
          },
        });
        answer = `I have prepared the request to delete task **${matchedTask.title}**.\n\nPlease confirm below before I permanently remove it.`;
      } else {
        answer = "Which task would you like to delete? Please specify the task title.";
      }
    }
    // Targeting Product / SKU / Item
    else {
      toolsUsed.push("inventory_sku_deleter");
      const matchedProduct = matchProductFromText(message, products);
      if (matchedProduct) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_PRODUCT",
          title: `Delete Product: ${matchedProduct.name}`,
          summary: `Permanently delete product "${matchedProduct.name}" (${matchedProduct.sku}) from inventory.`,
          payload: {
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            sku: matchedProduct.sku,
          },
        });
        answer = `I have prepared the request to delete product **${matchedProduct.name}** (**${matchedProduct.sku}**).\n\nBecause this will permanently remove it from inventory, please confirm below before I proceed.`;
      } else {
        answer = "Which item would you like to delete? Please specify the product name or SKU.";
      }
    }
  }

  // -------------------------------------------------------------
  // OPERATION 3: EDIT / UPDATE SOMETHING (Requires Human Confirmation)
  // -------------------------------------------------------------
  else if (
    !isQuery &&
    (
      lowerMsg.includes("edit") ||
      lowerMsg.includes("update") ||
      lowerMsg.includes("modify") ||
      lowerMsg.includes("change")
    )
  ) {
    // Sub-check A: Lead edit
    if (lowerMsg.includes("lead") || lowerMsg.includes("deal") || lowerMsg.includes("stage")) {
      toolsUsed.push("crm_lead_updater");
      const matchedLead = matchLeadFromText(message, leads);
      if (matchedLead) {
        const updates = {};
        const stageMatch = lowerMsg.match(/\b(won|lost|qualified|negotiation|proposal|contacted|new)\b/i);
        if (stageMatch) {
          updates.stage = stageMatch[1].charAt(0).toUpperCase() + stageMatch[1].slice(1).toLowerCase();
        }
        const valMatch = message.match(/(?:value|price|amount)?\s*\$?(\d+(?:\.\d{2})?)/i);
        if (valMatch && (lowerMsg.includes("value") || lowerMsg.includes("$"))) {
          updates.value = parseFloat(valMatch[1]);
        }

        const changesSummary = Object.entries(updates)
          .map(([k, v]) => `${k} to "${v}"`)
          .join(", ") || "requested fields";

        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "EDIT_LEAD",
          title: `Edit Lead: ${matchedLead.title}`,
          summary: `Update lead "${matchedLead.title}": Set ${changesSummary}.`,
          payload: {
            leadId: matchedLead.id,
            leadTitle: matchedLead.title,
            updates,
          },
        });
        answer = `I have prepared the update for lead **${matchedLead.title}** (${changesSummary}).\n\nPlease confirm below before I apply these changes.`;
      } else {
        answer = "Which lead would you like to edit? Please specify the lead title and what to change.";
      }
    }
    // Sub-check B: Task edit
    else if (lowerMsg.includes("task") || lowerMsg.includes("mark as completed") || lowerMsg.includes("done")) {
      toolsUsed.push("crm_task_updater");
      const matchedTask = matchTaskFromText(message, tasks);
      if (matchedTask) {
        const updates = {};
        if (lowerMsg.includes("complet") || lowerMsg.includes("done")) {
          updates.status = "COMPLETED";
        } else if (lowerMsg.includes("pending")) {
          updates.status = "PENDING";
        } else if (lowerMsg.includes("progress")) {
          updates.status = "IN_PROGRESS";
        }

        if (lowerMsg.includes("high priority") || lowerMsg.includes("priority high")) {
          updates.priority = "HIGH";
        } else if (lowerMsg.includes("medium priority") || lowerMsg.includes("priority medium")) {
          updates.priority = "MEDIUM";
        } else if (lowerMsg.includes("low priority") || lowerMsg.includes("priority low")) {
          updates.priority = "LOW";
        }

        const changesSummary = Object.entries(updates)
          .map(([k, v]) => `${k} to "${v}"`)
          .join(", ") || "status updated";

        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "EDIT_TASK",
          title: `Edit Task: ${matchedTask.title}`,
          summary: `Update task "${matchedTask.title}": Set ${changesSummary}.`,
          payload: {
            taskId: matchedTask.id,
            taskTitle: matchedTask.title,
            updates,
          },
        });
        answer = `I have prepared the update for task **${matchedTask.title}** (${changesSummary}).\n\nPlease confirm below before I apply these changes.`;
      } else {
        answer = "Which task would you like to edit? Please specify the task title.";
      }
    }
    // Sub-check C: Product edit
    else {
      toolsUsed.push("inventory_product_updater");
      const matchedProduct = matchProductFromText(message, products);
      if (matchedProduct) {
        const updates = {};
        // Check price update
        const priceMatch = message.match(/(?:price|cost)?\s*\$?(\d+(?:\.\d{2})?)/i);
        if (lowerMsg.includes("price") && priceMatch) {
          updates.unitPrice = parseFloat(priceMatch[1]);
        }
        // Check reorder point
        const reorderMatch = message.match(/(?:reorder point|min stock|threshold)?\s*to\s*(\d+)/i) || message.match(/(?:reorder point|threshold)\s*(\d+)/i);
        if ((lowerMsg.includes("reorder") || lowerMsg.includes("threshold") || lowerMsg.includes("min")) && reorderMatch) {
          updates.reorderPoint = parseInt(reorderMatch[1], 10);
        }
        // Check name update: e.g. "name to [X]"
        const nameMatch = message.match(/name to (?:["']?)([^"'\n,]+)(?:["']?)/i);
        if (nameMatch) {
          updates.name = nameMatch[1].trim();
        }

        const changesSummary = Object.entries(updates)
          .map(([k, v]) => `${k} to ${v}`)
          .join(", ") || "requested properties";

        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "EDIT_PRODUCT",
          title: `Edit Product: ${matchedProduct.name}`,
          summary: `Update ${matchedProduct.name} (${matchedProduct.sku}): Set ${changesSummary}.`,
          payload: {
            productId: matchedProduct.id,
            sku: matchedProduct.sku,
            productName: matchedProduct.name,
            updates,
          },
        });
        answer = `I have prepared the update for **${matchedProduct.name}** (**${matchedProduct.sku}**): ${changesSummary}.\n\nPlease confirm below before I apply the changes.`;
      } else {
        answer = "Which item would you like to edit? Please specify the product name or SKU and the new values.";
      }
    }
  }

  // -------------------------------------------------------------
  // QUERY 1: GENERAL INVENTORY & STOCK STATUS (Read Only)
  // -------------------------------------------------------------
  else if (
    lowerMsg.includes("stock") ||
    lowerMsg.includes("inventory") ||
    lowerMsg.includes("sku") ||
    lowerMsg.includes("product")
  ) {
    toolsUsed.push("warehouse_inventory_scanner");

    const lowStock = products.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint)
    );
    const outOfStock = products.filter((p) => Number(p.quantity) === 0);
    const healthyCount = products.length - lowStock.length - outOfStock.length;

    // If user asked about a specific product
    const specificProduct = products.find(
      (p) =>
        lowerMsg.includes(p.name.toLowerCase()) ||
        (p.sku && lowerMsg.includes(p.sku.toLowerCase()))
    );

    if (specificProduct) {
      answer = `You currently have **${specificProduct.quantity} units** of **${specificProduct.name}** (\`${specificProduct.sku}\`) in stock.\n\n- **Minimum Threshold:** ${specificProduct.reorderPoint} units\n- **Unit Price:** $${Number(specificProduct.unitPrice || 0).toFixed(2)}\n- **Status:** ${Number(specificProduct.quantity) === 0 ? "⚠️ Out of Stock" : Number(specificProduct.quantity) <= Number(specificProduct.reorderPoint) ? "⚠️ Low Stock" : "✅ Healthy"}`;
    } else {
      let summary = `Here is your current inventory overview:\n\n`;
      summary += `- **Total Inventory SKUs:** ${products.length}\n`;
      summary += `- **Healthy Stock:** ${healthyCount} items\n`;
      summary += `- **Low Stock Alerts:** ${lowStock.length} items\n`;
      if (outOfStock.length > 0) {
        summary += `- **Out of Stock:** ${outOfStock.length} items\n`;
      }

      if (products.length > 0) {
        summary += `\n**Inventory SKUs:**\n`;
        products.slice(0, 8).forEach((p) => {
          summary += `• **${p.name}** (\`${p.sku}\`) — ${p.quantity} in stock\n`;
        });
      }

      answer = summary;
    }
  }

  // -------------------------------------------------------------
  // QUERY 2: CRM & SALES LEADS (Read Only)
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
    const wonCount = leads.filter((l) => l.stage === "Won").length;
    const pendingTasksCount = tasks.filter((t) => t.status === "PENDING").length;

    answer = `You currently have **${leads.length} active lead(s)** totaling **$${pipelineTotal.toLocaleString()}** in pipeline value (${wonCount} won).\n\nThere are **${pendingTasksCount} pending follow-up task(s)**.\n\n` +
      leads.slice(0, 3).map((l) => `• **${l.title}** ($${Number(l.value || 0).toLocaleString()} — *${l.stage}*)`).join("\n");
  }

  // -------------------------------------------------------------
  // QUERY 3: TASKS (Read Only)
  // -------------------------------------------------------------
  else if (lowerMsg.includes("task")) {
    toolsUsed.push("crm_task_tracker");
    const pending = tasks.filter((t) => t.status === "PENDING");
    const completed = tasks.filter((t) => t.status === "COMPLETED");

    answer = `You have **${tasks.length} task(s)** (${pending.length} pending, ${completed.length} completed):\n\n` +
      tasks.slice(0, 5).map((t) => `• **${t.title}** [${t.status}] — Priority: ${t.priority}`).join("\n");
  }

  // -------------------------------------------------------------
  // General AI Reasoning with LLM (Simple, direct, concise style)
  // -------------------------------------------------------------
  if (!answer) {
    const systemPrompt = `You are a helpful, direct supply chain assistant for ${context.user.tenantName}.
User: ${context.user.name}
Execution Mode: ${context.mode}
Available Products: ${products.length} items
Active Leads: ${leads.length} leads

Instructions:
1. Answer simply, directly, and politely in 1 to 3 short sentences or concise bullet points.
2. Avoid unnecessary jargon, long introductory fluff, or oversized markdown sections.
3. If the user asks to perform an operation (like renewing stock, editing, or deleting an item), confirm what needs to be changed and remind them that you will ask for human confirmation before proceeding.
4. Never include resources, references, citations, or sources at the end of your response.`;

    const llmResponse = await callLLM(systemPrompt, message);

    if (llmResponse) {
      answer = llmResponse;
      toolsUsed.push("llm_reasoning");
    } else {
      answer = `Hello ${context.user.name}! I am your supply chain assistant. You can ask me simple questions about your stock, leads, or tasks, or instruct me to renew stock, edit items, or delete records. I will always ask for your confirmation before making any changes. How can I help you today?`;
    }
  }

  const executionTimeMs = Date.now() - startTime;
  let finalConvId = conversationId;

  if (!context.isDemo && process.env.DATABASE_URL && context.user?.tenantId && neonDb.isValidUuid(context.user.tenantId)) {
    try {
      if (!finalConvId || !neonDb.isValidUuid(finalConvId)) {
        const newConv = await neonDb.createConversationInDb(context.user.tenantId, context.user.id, {
          title: message.slice(0, 40) + (message.length > 40 ? "..." : ""),
          agentId: agentId || "supply-chain-agent",
        });
        finalConvId = newConv.id;
      }

      await neonDb.addMessageToDb(finalConvId, {
        sender: "USER",
        content: message,
      });

      await neonDb.addMessageToDb(finalConvId, {
        sender: "AGENT",
        content: answer,
        sources,
        toolsUsed,
        executionTimeMs,
        requiresConfirmation,
        pendingActionId: pendingAction?.id || null,
      });
    } catch (dbErr) {
      console.error("Neon conversation persistence error:", dbErr.message);
    }
  } else {
    // Persist conversation messages in Demo sandbox
    const db = getDemoDb();
    if (!db.conversations) db.conversations = [];

    let conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId || `conv-demo-${Date.now()}`,
        title: message.slice(0, 40) + (message.length > 40 ? "..." : ""),
        agentId: agentId || "supply-chain-agent",
        createdAt: new Date().toISOString(),
        messages: [],
      };
      db.conversations.unshift(conv);
    }
    finalConvId = conv.id;

    conv.messages.push({
      id: `msg-user-${Date.now()}`,
      sender: "USER",
      content: message,
      createdAt: new Date().toISOString(),
    });

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

    saveDemoDb();
  }

  return {
    answer,
    sources,
    toolsUsed,
    executionTimeMs,
    requiresConfirmation,
    pendingAction,
    conversationId: finalConvId,
    executionMode: context.mode,
  };
}
