import "./env.js";
import { storeAdapter, getDemoDb, saveDemoDb, getLiveDb, saveLiveDb } from "./store.js";
import * as neonDb from "./neonDb.js";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "groq/compound";
const FALLBACK_LLM_MODEL = process.env.FALLBACK_LLM_MODEL || "qwen/qwen3.6-27b";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const CRM_VALID_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];

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

  // 3. Try name tokens
  for (const p of products) {
    const tokens = p.name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    for (const token of tokens) {
      if (lower.includes(token)) return p;
    }
  }

  if (
    lower.includes(" it ") ||
    lower.endsWith(" it") ||
    lower.includes("this product") ||
    lower.includes("this item")
  ) {
    return products[0];
  }

  return null;
}

// Helper: match lead from message text
function matchLeadFromText(text, leads) {
  if (!leads || leads.length === 0) return null;
  const lower = text.toLowerCase();

  // 1. Check title, name, companyName exact containment in text
  for (const l of leads) {
    const title = (l.title || l.name || "").toLowerCase().trim();
    if (title && lower.includes(title)) return l;
    const company = (l.companyName || l.company || "").toLowerCase().trim();
    if (company && lower.includes(company)) return l;
    const contact = (l.contactName || "").toLowerCase().trim();
    if (contact && lower.includes(contact)) return l;
  }

  // 2. Check quoted strings e.g. "National Courier Fleet Automation"
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted) {
    const q = quoted[1].toLowerCase().trim();
    const found = leads.find((l) => 
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.companyName && l.companyName.toLowerCase().includes(q))
    );
    if (found) return found;
  }

  // 3. Pattern matches for action commands:
  // e.g. "move the [name] to", "move [name] to", "advance [name] to", "lead [name] to"
  const actionLeadMatch = text.match(/(?:move|advance|shift|transfer|transition|put|promote|change|update|edit)\s+(?:the\s+)?(?:lead\s+)?([a-zA-Z0-9_\-\s]+?)(?:\s+to\s+stage|\s+to|\s+into|\s+in\s+stage|\s+in|$)/i);
  if (actionLeadMatch && actionLeadMatch[1]) {
    const cand = actionLeadMatch[1].trim().toLowerCase();
    if (cand && cand !== "the" && cand !== "a" && cand !== "lead") {
      const found = leads.find((l) =>
        (l.title && l.title.toLowerCase().includes(cand)) ||
        (l.name && l.name.toLowerCase().includes(cand)) ||
        (l.companyName && l.companyName.toLowerCase().includes(cand)) ||
        cand.includes((l.title || l.name || "").toLowerCase())
      );
      if (found) return found;
    }
  }

  // 4. Check general pattern: lead [name]
  const patternMatch = text.match(/(?:lead\s+amount\s+of|lead\s+value\s+of|lead\s+of|lead\s+named|lead)\s+([a-zA-Z0-9_\-\s]+?)(?:\s+from|\s+to|\s+value|\s+amount|\s+stage|$)/i);
  if (patternMatch && patternMatch[1]) {
    const cand = patternMatch[1].trim().toLowerCase();
    if (cand && cand !== "the" && cand !== "a") {
      const found = leads.find((l) =>
        (l.title && l.title.toLowerCase().includes(cand)) ||
        (l.name && l.name.toLowerCase().includes(cand)) ||
        (l.companyName && l.companyName.toLowerCase().includes(cand))
      );
      if (found) return found;
    }
  }

  // 5. Multi-token matches (all significant tokens >= 3 chars contained in message)
  for (const l of leads) {
    const tokens = (l.title || l.name || "").toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0 && tokens.every((t) => lower.includes(t))) {
      return l;
    }
  }

  // 6. Partial token matches (e.g. 2 or more significant tokens match)
  for (const l of leads) {
    const tokens = (l.title || l.name || "").toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const matches = tokens.filter((t) => lower.includes(t));
    if (tokens.length >= 2 && matches.length >= 2) {
      return l;
    }
  }

  return null;
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

// Helper: extract target stage from text
function extractStageFromText(text) {
  const lower = text.toLowerCase();

  // 1. Check for explicit "to [stage]" or "to stage [stage]" or "stage [stage]"
  const stagePattern = /(?:to|into|in)?\s*(?:stage|status)\s*[:=]?\s*["']?([a-zA-Z0-9_\-]+)["']?/i;
  const match1 = text.match(stagePattern);
  if (match1 && match1[1]) {
    const raw = match1[1].trim();
    const canonical = CRM_VALID_STAGES.find((s) => s.toLowerCase() === raw.toLowerCase()) || null;
    return { raw, canonical };
  }

  const toPattern = /(?:to|into)\s+["']?([a-zA-Z0-9_\-]+)["']?/i;
  const match2 = text.match(toPattern);
  if (match2 && match2[1]) {
    const raw = match2[1].trim();
    const canonical = CRM_VALID_STAGES.find((s) => s.toLowerCase() === raw.toLowerCase()) || null;
    if (canonical) {
      return { raw, canonical };
    }
  }

  // 2. Check for presence of valid stage names anywhere in text
  for (const stage of CRM_VALID_STAGES) {
    const reg = new RegExp(`\\b${stage}\\b`, "i");
    if (reg.test(lower)) {
      return { raw: stage, canonical: stage };
    }
  }

  return null;
}

// Helper: check if message is an affirmative confirmation for HITL
function isAffirmativeConfirmation(text) {
  const trimmed = text.trim().toLowerCase().replace(/[.!?,]/g, "");
  return /^(yes|confirm|confirmed|proceed|approve|approved|do it|go ahead|sure|yep|yeah|ok|okay|yes please|please do|execute)$/i.test(trimmed) ||
    trimmed === "yes" ||
    trimmed === "confirm" ||
    trimmed === "proceed";
}

// Helper: check if message is a cancellation for HITL
function isNegativeCancellation(text) {
  const trimmed = text.trim().toLowerCase().replace(/[.!?,]/g, "");
  return /^(no|cancel|cancelled|reject|rejected|abort|don't|stop|never mind|no thanks|do not)$/i.test(trimmed) ||
    trimmed === "no" ||
    trimmed === "cancel";
}

// Helper: check if message is an inquiry (read-only)
function isQuestionOrInquiry(lowerMsg) {
  // If it's a mutation command (move, restock, delete, renew, edit), it is NOT a read-only inquiry!
  if (
    lowerMsg.includes("move ") ||
    lowerMsg.includes("restock") ||
    lowerMsg.includes("renew stock") ||
    lowerMsg.includes("delete ") ||
    lowerMsg.includes("edit ") ||
    lowerMsg.includes("create ") ||
    lowerMsg.includes("add ") ||
    lowerMsg.includes("register ")
  ) {
    return false;
  }

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
    lowerMsg.endsWith("?")
  );
}

/**
 * Core agent chat orchestrator with mode-aware execution & HITL detection
 */
export async function executeAgentChat(context, { agentId, message, conversationId }) {
  const startTime = Date.now();
  const lowerMsg = message.toLowerCase().trim();

  // Load current mode's data from isolated store
  const products = await storeAdapter.getProducts(context);
  const leads = await storeAdapter.getLeads(context);
  const tasks = await storeAdapter.getTasks(context);

  let requiresConfirmation = false;
  let pendingAction = null;
  let executedAction = false;
  let toolsUsed = [];
  let answer = "";
  let sources = [];

  // =============================================================
  // STEP 1: CONVERSATIONAL HITL CONFIRMATION OR CANCELLATION
  // =============================================================
  if (isAffirmativeConfirmation(lowerMsg)) {
    const activeActions = await storeAdapter.getPendingActions(context);
    if (activeActions && activeActions.length > 0) {
      const actionToApprove = activeActions[0];
      toolsUsed.push("hitl_confirmation_executor");
      const result = await storeAdapter.approvePendingAction(context, actionToApprove.id);
      executedAction = true;
      pendingAction = {
        ...actionToApprove,
        status: "APPROVED",
        result,
      };

      if (actionToApprove.actionType === "EDIT_LEAD") {
        const leadTitle = actionToApprove.payload?.leadTitle || "Lead";
        const destStage = actionToApprove.payload?.toStage || actionToApprove.payload?.updates?.stage;
        if (destStage) {
          answer = `Done. The lead "${leadTitle}" has been moved to ${destStage}.`;
        } else {
          answer = `Done. Lead "${leadTitle}" has been updated successfully.`;
        }
      } else if (actionToApprove.actionType === "CREATE_CUSTOMER") {
        const custName = actionToApprove.payload?.name || "Customer Account";
        const acctNo = actionToApprove.payload?.accountNo ? ` (#${actionToApprove.payload.accountNo})` : "";
        answer = `Done. Customer account "${custName}"${acctNo} has been created and is now active in your CRM.`;
      } else if (actionToApprove.actionType === "CREATE_LEAD") {
        const leadTitle = actionToApprove.payload?.title || "Lead";
        answer = `Done. Lead "${leadTitle}" has been created in your CRM pipeline.`;
      } else if (actionToApprove.actionType === "CREATE_TASK") {
        const taskTitle = actionToApprove.payload?.title || "Task";
        answer = `Done. Task "${taskTitle}" has been created in your tasks.`;
      } else if (actionToApprove.actionType === "RESTOCK_PRODUCT") {
        const prodName = actionToApprove.payload?.productName || "Product";
        const delta = actionToApprove.payload?.quantityDelta || 0;
        answer = `Done. Restocked ${prodName} by +${delta} units.`;
      } else if (actionToApprove.actionType === "DELETE_LEAD") {
        answer = `Done. Lead "${actionToApprove.payload?.leadTitle || "Lead"}" has been deleted.`;
      } else if (actionToApprove.actionType === "DELETE_PRODUCT") {
        answer = `Done. Product "${actionToApprove.payload?.productName || "Product"}" has been deleted.`;
      } else if (actionToApprove.actionType === "DELETE_TASK") {
        answer = `Done. Task "${actionToApprove.payload?.taskTitle || "Task"}" has been deleted.`;
      } else {
        answer = `Done. Confirmed and executed ${actionToApprove.title || "operation"}.`;
      }
    } else {
      answer = "There are no pending actions awaiting your confirmation.";
    }
  } else if (isNegativeCancellation(lowerMsg)) {
    const activeActions = await storeAdapter.getPendingActions(context);
    if (activeActions && activeActions.length > 0) {
      const actionToReject = activeActions[0];
      toolsUsed.push("hitl_cancellation_executor");
      await storeAdapter.rejectPendingAction(context, actionToReject.id);
      pendingAction = {
        ...actionToReject,
        status: "REJECTED",
      };
      answer = `Understood. The action "${actionToReject.title || "operation"}" was cancelled and no changes were made.`;
    } else {
      answer = "No pending action was found to cancel.";
    }
  }

  // =============================================================
  // STEP 2: LEAD STAGE MOVE / UPDATE FLOW (ACTION REQUEST)
  // e.g. "Please move the National Courier Fleet Automation to stage Contacted"
  // =============================================================
  else if (
    (lowerMsg.includes("move") ||
      lowerMsg.includes("advance") ||
      lowerMsg.includes("shift") ||
      lowerMsg.includes("transition") ||
      lowerMsg.includes("transfer") ||
      lowerMsg.includes("put") ||
      lowerMsg.includes("set") ||
      lowerMsg.includes("change")) &&
    (lowerMsg.includes("stage") ||
      CRM_VALID_STAGES.some((s) => lowerMsg.includes(s.toLowerCase())))
  ) {
    toolsUsed.push("crm_lead_stage_router");

    const stageInfo = extractStageFromText(message);
    const matchedLead = matchLeadFromText(message, leads);

    if (!stageInfo || !stageInfo.raw) {
      if (matchedLead) {
        answer = `Which stage would you like to move "${matchedLead.title}" to? Valid stages are: ${CRM_VALID_STAGES.join(", ")}.`;
      } else {
        answer = `Which lead would you like to move, and to what stage? Valid stages are: ${CRM_VALID_STAGES.join(", ")}.`;
      }
    } else if (!stageInfo.canonical) {
      // User specified an invalid stage
      answer = `"${stageInfo.raw}" is not a valid CRM stage. Valid stages are: ${CRM_VALID_STAGES.join(", ")}.`;
    } else {
      const targetStage = stageInfo.canonical;

      if (!matchedLead) {
        // Extract candidate lead name
        const leadMatch = message.match(/(?:move|advance|shift|transfer|transition|put|change|set)\s+(?:the\s+)?(?:lead\s+)?([a-zA-Z0-9_\-\s]+?)(?:\s+to\s+stage|\s+to|\s+into|\s+stage|$)/i);
        const candidateName = leadMatch && leadMatch[1] ? leadMatch[1].trim() : "";

        const leadsList = (leads || [])
          .slice(0, 5)
          .map((l) => `• **${l.title}** (Current stage: *${l.stage}*)`)
          .join("\n");

        if (candidateName && candidateName.length > 1) {
          answer = `I could not find an existing lead matching "${candidateName}" in your CRM pipeline.\n\nHere are your current active leads:\n${leadsList}\n\nPlease verify the lead name.`;
        } else {
          answer = `Which lead would you like to move to ${targetStage}? Here are your current active leads:\n${leadsList}`;
        }
      } else {
        const currentStage = matchedLead.stage || "New";

        if (currentStage.toLowerCase() === targetStage.toLowerCase()) {
          answer = `The lead "${matchedLead.title}" is already in the "${currentStage}" stage.`;
        } else {
          requiresConfirmation = true;
          pendingAction = await storeAdapter.createPendingAction(context, {
            actionType: "EDIT_LEAD",
            title: `Move Lead: ${matchedLead.title}`,
            summary: `Move lead "${matchedLead.title}" from ${currentStage} to ${targetStage}`,
            payload: {
              leadId: matchedLead.id,
              leadTitle: matchedLead.title,
              fromStage: currentStage,
              toStage: targetStage,
              updates: { stage: targetStage },
            },
          });

          answer = `I found the lead "${matchedLead.title}". You want to move it from ${currentStage} to ${targetStage}. Shall I proceed?`;
        }
      }
    }
  }

  // =============================================================
  // STEP 3: RENEW / RESTOCK PRODUCT (Requires Confirmation)
  // =============================================================
  else if (
    lowerMsg.includes("renew stock") ||
    lowerMsg.includes("renew the stock") ||
    lowerMsg.startsWith("restock") ||
    lowerMsg.includes("restock ") ||
    lowerMsg.includes("replenish") ||
    lowerMsg.startsWith("order ") ||
    lowerMsg.includes("order +") ||
    (lowerMsg.includes("order") && (lowerMsg.includes("unit") || lowerMsg.includes("item") || lowerMsg.includes("more") || lowerMsg.includes("stock"))) ||
    (lowerMsg.includes("add") && (lowerMsg.includes("stock") || lowerMsg.includes("unit") || lowerMsg.includes("qty")))
  ) {
    toolsUsed.push("inventory_restock_evaluator");
    const matchedProduct = matchProductFromText(message, products);

    if (!matchedProduct) {
      answer = "Which product would you like to restock? Please specify the product name or SKU.";
    } else {
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

  // =============================================================
  // STEP 4: DELETE RECORD (Requires Confirmation)
  // =============================================================
  else if (
    lowerMsg.includes("delete") ||
    lowerMsg.includes("remove") ||
    lowerMsg.includes("erase") ||
    lowerMsg.includes("drop")
  ) {
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
    } else if (lowerMsg.includes("task")) {
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
    } else {
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

  // =============================================================
  // STEP 5: EDIT / UPDATE RECORD (Requires Confirmation)
  // =============================================================
  else if (
    lowerMsg.includes("edit") ||
    lowerMsg.includes("update") ||
    lowerMsg.includes("modify")
  ) {
    if (lowerMsg.includes("lead") || lowerMsg.includes("deal")) {
      toolsUsed.push("crm_lead_updater");
      const matchedLead = matchLeadFromText(message, leads);
      if (matchedLead) {
        const updates = {};
        const stageInfo = extractStageFromText(message);
        if (stageInfo && stageInfo.canonical) {
          updates.stage = stageInfo.canonical;
        }

        const toMatch = message.match(/(?:to|set\s+to|=)\s*\$?([0-9,]+(?:\.[0-9]+)?k?)/i);
        if (toMatch) {
          let rawVal = toMatch[1].replace(/,/g, "").toLowerCase();
          let mult = 1;
          if (rawVal.endsWith("k")) {
            mult = 1000;
            rawVal = rawVal.replace("k", "");
          }
          const parsed = parseFloat(rawVal) * mult;
          if (!isNaN(parsed)) updates.value = parsed;
        }

        const changesList = [];
        if (updates.value !== undefined) changesList.push(`Amount to $${updates.value.toLocaleString()}`);
        if (updates.stage) changesList.push(`Stage to "${updates.stage}"`);

        if (changesList.length === 0) {
          answer = `I located lead **${matchedLead.title}** (Amount: $${Number(matchedLead.value || 0).toLocaleString()}, Stage: ${matchedLead.stage}). What would you like to update?`;
        } else {
          const changesSummary = changesList.join(", ");
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
          answer = `I have prepared the update for lead **${matchedLead.title}** (${changesSummary}).\n\nPlease confirm below to apply this update.`;
        }
      } else {
        answer = "Which lead would you like to update? Please specify the lead name.";
      }
    } else if (lowerMsg.includes("task")) {
      toolsUsed.push("crm_task_updater");
      const matchedTask = matchTaskFromText(message, tasks);
      if (matchedTask) {
        const updates = {};
        if (lowerMsg.includes("complet") || lowerMsg.includes("done")) updates.status = "COMPLETED";
        else if (lowerMsg.includes("pending")) updates.status = "PENDING";
        else if (lowerMsg.includes("progress")) updates.status = "IN_PROGRESS";

        const changesSummary = Object.entries(updates).map(([k, v]) => `${k} to "${v}"`).join(", ") || "status updated";
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
        answer = `I have prepared the update for task **${matchedTask.title}** (${changesSummary}).\n\nPlease confirm below to proceed.`;
      } else {
        answer = "Which task would you like to edit? Please specify the task title.";
      }
    } else {
      toolsUsed.push("inventory_product_updater");
      const matchedProduct = matchProductFromText(message, products);
      if (matchedProduct) {
        const updates = {};
        const priceMatch = message.match(/(?:price|cost)?\s*\$?(\d+(?:\.\d{2})?)/i);
        if (lowerMsg.includes("price") && priceMatch) {
          updates.unitPrice = parseFloat(priceMatch[1]);
        }
        const reorderMatch = message.match(/(?:reorder point|min stock|threshold)?\s*to\s*(\d+)/i) || message.match(/(?:reorder point|threshold)\s*(\d+)/i);
        if ((lowerMsg.includes("reorder") || lowerMsg.includes("threshold") || lowerMsg.includes("min")) && reorderMatch) {
          updates.reorderPoint = parseInt(reorderMatch[1], 10);
        }

        const changesSummary = Object.entries(updates).map(([k, v]) => `${k} to ${v}`).join(", ") || "requested properties";
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
        answer = "Which item would you like to edit? Please specify the product name or SKU.";
      }
    }
  }

  // =============================================================
  // STEP 5B: CREATE RECORD (Requires Confirmation)
  // e.g. "create a customer account with customer account 12 ,Industry is Aeropax Industries, Primary Contact is 03001254165,Status active,Created on 12/1/2026"
  // =============================================================
  else if (
    (lowerMsg.includes("create") ||
      lowerMsg.includes("add") ||
      lowerMsg.includes("register") ||
      lowerMsg.includes("new ") ||
      lowerMsg.includes("insert") ||
      lowerMsg.includes("open ")) &&
    (lowerMsg.includes("customer") ||
      lowerMsg.includes("account") ||
      lowerMsg.includes("client"))
  ) {
    toolsUsed.push("crm_customer_creator");

    // 1. Extract Account Number
    let accountNo = "";
    const acctMatch = message.match(/(?:customer\s+account|account\s+no|account\s+number|account\s+#|account|acc\s+no)\s*[:#]?\s*([a-zA-Z0-9_-]+)/i);
    if (acctMatch) {
      accountNo = acctMatch[1].trim();
    }

    // 2. Extract Industry / Domain
    let industry = "";
    const indMatch = message.match(/(?:industry|domain|sector)\s*(?:is|:|=)\s*([^,\n;]+)/i);
    if (indMatch) {
      industry = indMatch[1].trim();
    }

    // 3. Extract Primary Contact / Phone
    let primaryContact = "";
    const contactMatch = message.match(/(?:primary\s+contact|contact\s+person|contact|phone)\s*(?:is|:|=)\s*([^,\n;]+)/i);
    if (contactMatch) {
      primaryContact = contactMatch[1].trim();
    }

    // 4. Extract Status
    let status = "ACTIVE";
    const statusMatch = message.match(/(?:status)\s*(?:is|:|=)?\s*([a-zA-Z]+)/i);
    if (statusMatch) {
      status = statusMatch[1].trim().toUpperCase();
    }

    // 5. Extract Created Date
    let createdAt = new Date().toISOString();
    const dateMatch = message.match(/(?:created\s+on|created\s+at|created|date)\s*(?:is|:|=)?\s*([0-9\/\-\.]+)/i);
    if (dateMatch) {
      const rawDate = dateMatch[1].trim();
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        createdAt = parsed.toISOString();
      } else {
        createdAt = rawDate;
      }
    }

    // Determine customer/company name
    let customerName = "";
    const companyMatch = message.match(/(?:company|name|title)\s*(?:is|:|=)\s*([^,\n;]+)/i);
    if (companyMatch) {
      customerName = companyMatch[1].trim();
    } else if (industry && /industries|logistics|systems|corp|inc|ltd|group|technologies|solutions/i.test(industry)) {
      customerName = industry;
    } else if (accountNo) {
      customerName = `Customer Account #${accountNo}`;
    } else {
      customerName = "New Customer Account";
    }

    const payload = {
      accountNo: accountNo || (Date.now() % 1000).toString(),
      name: customerName,
      company: customerName,
      industry: industry || "Aeropax Industries",
      contactName: primaryContact && !/^\+?[0-9\-\s()]+$/.test(primaryContact) ? primaryContact : "Primary Contact",
      email: primaryContact && primaryContact.includes("@") ? primaryContact : "contact@client.com",
      phone: /^\+?[0-9\-\s()]+$/.test(primaryContact) ? primaryContact : (primaryContact || "+1 (555) 019-2831"),
      status,
      isActive: status === "ACTIVE",
      createdAt,
    };

    requiresConfirmation = true;
    pendingAction = await storeAdapter.createPendingAction(context, {
      actionType: "CREATE_CUSTOMER",
      title: `Create Customer Account: ${payload.name}`,
      summary: `Register customer account #${payload.accountNo} (${payload.name}) in ${payload.industry}.`,
      payload,
    });

    const displayDate = !isNaN(new Date(payload.createdAt).getTime()) ? new Date(payload.createdAt).toLocaleDateString() : payload.createdAt;
    answer = `I have prepared the request to create a customer account with the following details:\n\n` +
      `• **Customer Account:** #${payload.accountNo} (${payload.name})\n` +
      `• **Industry / Domain:** ${payload.industry}\n` +
      `• **Primary Contact:** ${payload.phone || payload.contactName}\n` +
      `• **Status:** ${payload.status}\n` +
      `• **Created On:** ${displayDate}\n\n` +
      `Please confirm below before I proceed with registering this customer account.`;
  }

  else if (
    (lowerMsg.includes("create") || lowerMsg.includes("add") || lowerMsg.includes("new ")) &&
    (lowerMsg.includes("lead") || lowerMsg.includes("deal") || lowerMsg.includes("opportunity"))
  ) {
    toolsUsed.push("crm_lead_creator");
    const titleMatch = message.match(/(?:lead|deal|opportunity)\s+(?:for\s+|named\s+|called\s+)?([^,\n;]+)/i);
    const title = titleMatch ? titleMatch[1].replace(/(?:with|value|stage|for).*/i, "").trim() : "New Prospect Lead";
    const valueMatch = message.match(/\$?([0-9,]+(?:\.[0-9]+)?k?)/i);
    let value = 50000;
    if (valueMatch) {
      let raw = valueMatch[1].replace(/,/g, "").toLowerCase();
      let mult = 1;
      if (raw.endsWith("k")) { mult = 1000; raw = raw.replace("k", ""); }
      const p = parseFloat(raw) * mult;
      if (!isNaN(p)) value = p;
    }
    const stageInfo = extractStageFromText(message);
    const stage = (stageInfo && stageInfo.canonical) || "New";

    const payload = {
      title,
      name: title,
      companyName: title,
      value,
      stage,
      priority: "HIGH",
      notes: "Created via AI Assistant",
    };

    requiresConfirmation = true;
    pendingAction = await storeAdapter.createPendingAction(context, {
      actionType: "CREATE_LEAD",
      title: `Create Lead: ${title}`,
      summary: `Register new lead "${title}" ($${value.toLocaleString()}) in stage ${stage}.`,
      payload,
    });
    answer = `I have prepared the request to create lead **${title}** ($${value.toLocaleString()} — stage: *${stage}*).\n\nPlease confirm below to add this lead to your pipeline.`;
  }

  else if (
    (lowerMsg.includes("create") || lowerMsg.includes("add") || lowerMsg.includes("new ")) &&
    lowerMsg.includes("task")
  ) {
    toolsUsed.push("crm_task_creator");
    const titleMatch = message.match(/(?:task)\s+(?:to\s+|for\s+|named\s+|called\s+)?([^,\n;]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : "Follow up with client";
    const payload = {
      title,
      status: "PENDING",
      priority: "HIGH",
    };
    requiresConfirmation = true;
    pendingAction = await storeAdapter.createPendingAction(context, {
      actionType: "CREATE_TASK",
      title: `Create Task: ${title}`,
      summary: `Create task "${title}" in CRM.`,
      payload,
    });
    answer = `I have prepared the request to create task **${title}**.\n\nPlease confirm below before I add this task.`;
  }

  // =============================================================
  // STEP 6: READ-ONLY INQUIRIES & QUERIES
  // =============================================================
  // 6A. Low Stock Inquiry
  else if (
    lowerMsg.includes("low stock") ||
    lowerMsg.includes("out of stock") ||
    (lowerMsg.includes("low") && lowerMsg.includes("stock")) ||
    (lowerMsg.includes("which") && lowerMsg.includes("product")) ||
    (isQuestionOrInquiry(lowerMsg) && (lowerMsg.includes("reorder") || lowerMsg.includes("restock")))
  ) {
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

  // 6B. General Inventory / Stock Query
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

  // 6C. CRM & Pipeline Inquiry
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
      leads.slice(0, 5).map((l) => `• **${l.title}** ($${Number(l.value || 0).toLocaleString()} — *${l.stage}*)`).join("\n");
  }

  // 6D. Tasks Inquiry
  else if (lowerMsg.includes("task")) {
    toolsUsed.push("crm_task_tracker");
    const pending = tasks.filter((t) => t.status === "PENDING");
    const completed = tasks.filter((t) => t.status === "COMPLETED");

    answer = `You have **${tasks.length} task(s)** (${pending.length} pending, ${completed.length} completed):\n\n` +
      tasks.slice(0, 5).map((t) => `• **${t.title}** [${t.status}] — Priority: ${t.priority}`).join("\n");
  }

  // =============================================================
  // STEP 7: GENERAL AI REASONING WITH CONFIGURED LLM
  // =============================================================
  if (!answer) {
    const systemPrompt = `You are a helpful, direct supply chain assistant for ${context.user?.tenantName || "SmartSupply"}.
User: ${context.user?.name || "User"}
Execution Mode: ${context.mode}
Available Products: ${products.length} items
Active Leads: ${leads.length} leads (Valid stages: ${CRM_VALID_STAGES.join(", ")})

Instructions:
1. Answer simply, directly, and politely in 1 to 3 short sentences.
2. If the user requests to move or update a lead, renew stock, or delete records, explain that you can stage the request for their confirmation.
3. Never fabricate or invent records that do not exist in the database.
4. Do not include references or citation sections.`;

    const llmResponse = await callLLM(systemPrompt, message);

    if (llmResponse) {
      answer = llmResponse;
      toolsUsed.push("llm_reasoning");
    } else {
      answer = `Hello ${context.user?.name || "there"}! I am your supply chain assistant. You can ask me questions about your stock, leads, or tasks, or instruct me to move leads to new stages, renew stock, edit items, or delete records. I will always ask for your confirmation before making changes. How can I help you today?`;
    }
  }

  const executionTimeMs = Date.now() - startTime;
  let finalConvId = conversationId;

  // Persist conversation messages with strict LIVE vs DEMO isolation
  if (!context.isDemo && neonDb.isNeonConfigured() && context.user?.tenantId && neonDb.isValidUuid(context.user.tenantId)) {
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
    const isLive = !context.isDemo;
    const db = isLive ? getLiveDb() : getDemoDb();
    if (!db.conversations) db.conversations = [];

    let conv = db.conversations.find((c) => c.id === conversationId);
    if (!conv) {
      conv = {
        id: conversationId || `conv-${isLive ? "live" : "demo"}-${Date.now()}`,
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

    if (isLive) saveLiveDb(); else saveDemoDb();
  }

  return {
    answer,
    sources,
    toolsUsed,
    executionTimeMs,
    requiresConfirmation,
    pendingAction,
    executedAction,
    conversationId: finalConvId,
    executionMode: context.mode,
  };
}
