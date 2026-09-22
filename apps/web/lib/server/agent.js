import "./env.js";
import { storeAdapter, getDemoDb, saveDemoDb, getLiveDb, saveLiveDb } from "./store.js";
import * as neonDb from "./neonDb.js";
import memoryService from "./memory.js";

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
    // 1. Try Primary Configured Model
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

    // 2. Try Fallback Model
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

// -------------------------------------------------------------
// ENTITY MATCHERS & PARSERS
// -------------------------------------------------------------

/**
 * Matches a product from message text by SKU, name, or tokens.
 */
function matchProductFromText(text, products) {
  if (!products || products.length === 0) return null;
  const lower = text.toLowerCase().trim();

  // 1. Try exact or partial SKU match
  for (const p of products) {
    if (p.sku && lower.includes(p.sku.toLowerCase())) return p;
  }

  // 2. Exact name match
  for (const p of products) {
    if (p.name && lower.includes(p.name.toLowerCase())) return p;
  }

  // 3. Extract candidate product name from command
  const prodMatch = text.match(/(?:product|item|stock of|stock for)\s+([a-zA-Z0-9_\-\s]+?)(?:\s+by|\s+to|\s+from|\s+with|\s+units|\s+at|$)/i);
  if (prodMatch && prodMatch[1]) {
    const cand = prodMatch[1].trim().toLowerCase();
    if (cand && !["the", "a", "this", "my"].includes(cand)) {
      for (const p of products) {
        const pName = p.name.toLowerCase();
        if (pName.includes(cand) || cand.includes(pName)) return p;
      }
    }
  }

  // 4. Token match: check how many significant tokens (>2 chars) match
  let bestProduct = null;
  let maxScore = 0;
  for (const p of products) {
    const tokens = p.name.toLowerCase().split(/[\s,._\-/]+/).filter((t) => t.length > 2);
    let score = 0;
    for (const t of tokens) {
      if (lower.includes(t)) score += t.length;
    }
    if (score > maxScore && score >= 4) {
      maxScore = score;
      bestProduct = p;
    }
  }
  if (bestProduct) return bestProduct;

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

/**
 * Extracts a candidate lead identifier (ID, accountNo, or title) from text.
 */
function extractLeadIdentifierCandidate(text) {
  // Check for #L-2357, L-2357, lead-live-1, #123, etc.
  const idMatch = text.match(/(?:#?L[-\s]?\d+|lead-[a-zA-Z0-9_\-]+|#[a-zA-Z0-9_\-]+)/i);
  if (idMatch) return idMatch[0].trim();

  // Check quoted strings
  const quoted = text.match(/["']([^"']+)["']/);
  if (quoted) return quoted[1].trim();

  // Check "lead <identifier>"
  const leadMatch = text.match(/(?:lead|deal|opportunity)\s+([a-zA-Z0-9_\-\s#]+?)(?:\s+from|\s+to|\s+value|\s+amount|\s+stage|$)/i);
  if (leadMatch && leadMatch[1]) {
    const cand = leadMatch[1].trim();
    if (!["the", "a", "this", "my", "that"].includes(cand.toLowerCase())) {
      return cand;
    }
  }

  return null;
}

/**
 * Matches a lead from message text by ID, account number, company, or title.
 */
function matchLeadFromText(text, leads) {
  if (!leads || leads.length === 0) return null;
  const lower = text.toLowerCase().trim();

  // 1. Exact ID match (e.g. "lead-live-1", "lead-demo-1", "L-2357", "#L-2357")
  const idCandidate = extractLeadIdentifierCandidate(text);
  if (idCandidate) {
    const cleanCand = idCandidate.replace(/^#/g, "").toLowerCase().trim();
    for (const l of leads) {
      if (l.id && l.id.toLowerCase() === cleanCand) return l;
      if (l.id && l.id.toLowerCase().includes(cleanCand)) return l;
      if (l.accountNo && l.accountNo.toLowerCase() === cleanCand) return l;
      if (l.accountNo && l.accountNo.toLowerCase().includes(cleanCand)) return l;
      // Strip prefix "lead-"
      const strippedId = String(l.id).replace(/^lead-/i, "").toLowerCase();
      if (strippedId && cleanCand.includes(strippedId)) return l;
      // Match numeric part e.g. "2357"
      const numMatch = cleanCand.match(/\d+/);
      if (numMatch && (String(l.id).includes(numMatch[0]) || String(l.accountNo).includes(numMatch[0]))) {
        return l;
      }
    }
  }

  // 2. Direct exact title or company match (critical for follow-up turns)
  for (const l of leads) {
    const title = (l.title || l.name || "").toLowerCase().trim();
    if (title && (lower === title || lower.includes(title))) return l;
    const company = (l.companyName || l.company || "").toLowerCase().trim();
    if (company && (lower === company || lower.includes(company))) return l;
  }

  // 3. Quoted strings
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

  // 4. Action commands: "move the [name] to", "delete lead [name]"
  const actionLeadMatch = text.match(/(?:move|advance|shift|transfer|transition|put|promote|change|update|edit|delete|remove|erase|drop)\s+(?:the\s+)?(?:lead\s+)?([a-zA-Z0-9_\-\s#]+?)(?:\s+to\s+stage|\s+to|\s+into|\s+in\s+stage|\s+in|$)/i);
  if (actionLeadMatch && actionLeadMatch[1]) {
    const cand = actionLeadMatch[1].trim().toLowerCase().replace(/^#/g, "");
    if (cand && !["the", "a", "this", "my", "lead", "item"].includes(cand)) {
      const found = leads.find((l) =>
        (l.title && l.title.toLowerCase().includes(cand)) ||
        (l.name && l.name.toLowerCase().includes(cand)) ||
        (l.companyName && l.companyName.toLowerCase().includes(cand)) ||
        (l.id && l.id.toLowerCase().includes(cand)) ||
        (l.accountNo && l.accountNo.toLowerCase().includes(cand)) ||
        cand.includes((l.title || l.name || "").toLowerCase())
      );
      if (found) return found;
    }
  }

  // 5. Multi-token matches
  for (const l of leads) {
    const tokens = (l.title || l.name || "").toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0 && tokens.every((t) => lower.includes(t))) {
      return l;
    }
  }

  // 6. Partial token matches (>=2 significant tokens)
  for (const l of leads) {
    const tokens = (l.title || l.name || "").toLowerCase().split(/\s+/).filter((t) => t.length > 3);
    const matches = tokens.filter((t) => lower.includes(t));
    if (tokens.length >= 2 && matches.length >= 2) {
      return l;
    }
  }

  return null;
}

/**
 * Matches a task from message text by title, id, or key entity tokens.
 */
function matchTaskFromText(text, tasks) {
  if (!tasks || tasks.length === 0) return null;
  const lower = text.toLowerCase().trim();

  // 1. Direct ID match (e.g. "task-demo-1", "task-1", "#task-demo-1")
  const idMatch = text.match(/(?:#?task-[a-zA-Z0-9_\-]+|#\d+)/i);
  if (idMatch) {
    const rawId = idMatch[0].replace(/^#/g, "").toLowerCase();
    const foundById = tasks.find((t) => t.id && t.id.toLowerCase() === rawId);
    if (foundById) return foundById;
  }

  // 2. Full title contains
  for (const t of tasks) {
    const title = (t.title || "").toLowerCase().trim();
    if (title && (lower.includes(title) || title.includes(lower))) return t;
  }

  // 3. Normalized candidate match
  // Handles queries like "Delete the Follow up task with Marcus Vance on AeroTech quotation"
  // matching task title "Follow up with Marcus Vance on AeroTech quotation"
  const cleanUserQuery = lower
    .replace(/^(?:please\s+)?(?:can you\s+)?(?:delete|remove|erase|cancel|drop|destroy)\s+(?:the\s+)?(?:task\s+)?/i, "")
    .replace(/\b(?:the\s+)?(?:task|todo|to-do)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const t of tasks) {
    const cleanTitle = (t.title || "").toLowerCase().replace(/\b(?:the\s+)?(?:task|todo|to-do)\b/gi, "").replace(/\s+/g, " ").trim();
    if (cleanTitle && cleanUserQuery) {
      if (cleanUserQuery.includes(cleanTitle) || cleanTitle.includes(cleanUserQuery)) {
        return t;
      }
    }
  }

  // 4. Token & key entity overlap scoring
  let bestTask = null;
  let highestScore = 0;
  const stopWords = new Set(["delete", "remove", "erase", "cancel", "drop", "destroy", "the", "task", "with", "on", "for", "to", "in", "at", "a", "an", "of", "and", "please", "can", "you"]);

  const userWords = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  for (const t of tasks) {
    const combined = `${t.title || ""} ${t.description || ""}`.toLowerCase();
    let score = 0;
    for (const w of userWords) {
      if (combined.includes(w)) {
        score++;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestTask = t;
    }
  }

  // Match if 2 or more significant words match (e.g. "marcus" + "vance", or "aerotech" + "quotation")
  if (bestTask && highestScore >= 2) {
    return bestTask;
  }

  // 5. Distinct single keyword match if query mentions a unique name like Marcus or AeroTech
  for (const t of tasks) {
    const combined = `${t.title || ""} ${t.description || ""}`.toLowerCase();
    if (userWords.some((w) => w.length >= 5 && combined.includes(w))) {
      return t;
    }
  }

  return null;
}

/**
 * Extracts target CRM stage from text.
 */
function extractStageFromText(text) {
  const lower = text.toLowerCase();

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

  for (const stage of CRM_VALID_STAGES) {
    const reg = new RegExp(`\\b${stage}\\b`, "i");
    if (reg.test(lower)) {
      return { raw: stage, canonical: stage };
    }
  }

  return null;
}

/**
 * Parses date phrases like "30 sep 2026", "2026-09-30", "tomorrow".
 */
function extractDueDateFromText(text) {
  const monthNames = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  // e.g. "30 sep 2026" or "30th september 2026"
  const dmyMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{4})\b/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = monthNames[dmyMatch[2].toLowerCase()];
    const year = parseInt(dmyMatch[3], 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { dateStr, rawMatched: dmyMatch[0] };
  }

  // e.g. "september 30 2026" or "sep 30, 2026"
  const mdyMatch = text.match(/\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s+(\d{4})\b/i);
  if (mdyMatch) {
    const month = monthNames[mdyMatch[1].toLowerCase()];
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { dateStr, rawMatched: mdyMatch[0] };
  }

  // ISO date e.g. 2026-09-30
  const isoMatch = text.match(/\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (isoMatch) {
    const dateStr = `${isoMatch[1]}-${String(parseInt(isoMatch[2], 10)).padStart(2, "0")}-${String(parseInt(isoMatch[3], 10)).padStart(2, "0")}`;
    return { dateStr, rawMatched: isoMatch[0] };
  }

  // "tomorrow"
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(Date.now() + 86400000);
    return { dateStr: d.toISOString().split("T")[0], rawMatched: "tomorrow" };
  }

  // "next week"
  if (/\bnext week\b/i.test(text)) {
    const d = new Date(Date.now() + 7 * 86400000);
    return { dateStr: d.toISOString().split("T")[0], rawMatched: "next week" };
  }

  return null;
}

// -------------------------------------------------------------
// INTENT CLASSIFICATION HELPERS
// -------------------------------------------------------------

function isAffirmativeConfirmation(text) {
  const trimmed = text.trim().toLowerCase().replace(/[.,!?:;]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(yes|confirm|confirmed|proceed|approve|approved|do it|go ahead|sure|yep|yeah|ok|okay|yes please|please do|execute)$/i.test(trimmed)) {
    return true;
  }
  if (
    /^(?:yes|yep|yeah|sure|ok|okay)\b/i.test(trimmed) ||
    /\b(?:please\s+confirm|confirm\s+(?:this|that|it|action|request)|proceed|go\s+ahead|approve\s+(?:this|that|it))\b/i.test(trimmed)
  ) {
    if (!/\b(?:no|not|dont|don't|cancel|abort|stop)\b/i.test(trimmed)) {
      return true;
    }
  }
  return false;
}

function isNegativeCancellation(text) {
  const trimmed = text.trim().toLowerCase().replace(/[.,!?:;]/g, " ").replace(/\s+/g, " ").trim();
  if (/^(no|cancel|cancelled|reject|rejected|abort|don't|stop|never mind|no thanks|do not|nevermind)$/i.test(trimmed)) {
    return true;
  }
  if (
    /^(?:no|cancel|stop|abort)\b/i.test(trimmed) ||
    /\b(?:cancel\s+(?:this|that|it|action|request)|do\s+not|never\s*mind|no\s+thanks|keep\s+it)\b/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

/**
 * Robust check for Delete intent.
 */
function isDeleteIntent(lowerMsg, message) {
  return /(?:delete|remove|erase|drop|destroy|cancel)\b/i.test(message);
}

/**
 * Robust check for Task creation intent.
 * CRITICAL:
 * 1. Must NEVER return true if message expresses deletion/removal intent!
 * 2. Must return true for "Add a follow up task of meeting with the lead schedule on 30 sep 2026"
 * 3. Prevents Lead creation from firing.
 */
function isTaskCreationIntent(lowerMsg, message) {
  // Never classify deletion commands as task creation
  if (isDeleteIntent(lowerMsg, message)) return false;

  const hasTaskKeyword = lowerMsg.includes("task") || lowerMsg.includes("follow up") || lowerMsg.includes("follow-up") || lowerMsg.includes("todo");
  if (!hasTaskKeyword) return false;

  const hasCreateVerb = /(?:add|create|new|schedule|set up|register|insert|put|assign)\b/i.test(message);
  const hasTaskNoun = /\b(?:task|follow\s*-?\s*up|todo|to-do)\b/i.test(message);

  if (hasCreateVerb && hasTaskNoun) return true;
  if (/^(?:please\s+)?(?:can you\s+)?task\s+(?:to|for|of|about)\b/i.test(message)) return true;
  if (/\b(?:add|create|schedule|set up)\s+(?:a\s+)?follow\s*-?\s*up\b/i.test(message)) return true;

  return false;
}

/**
 * Robust check for Lead creation intent.
 * CRITICAL: Must NEVER return true if isTaskCreationIntent or isDeleteIntent is true!
 */
function isLeadCreationIntent(lowerMsg, message) {
  if (isDeleteIntent(lowerMsg, message)) return false;
  if (isTaskCreationIntent(lowerMsg, message)) return false;

  const hasCreateVerb = /(?:add|create|new|register|insert|open)\b/i.test(message);
  const hasLeadNoun = /\b(?:lead|deal|opportunity|prospect)\b/i.test(message);

  return hasCreateVerb && hasLeadNoun;
}

/**
 * Robust check for Customer creation intent.
 */
function isCustomerCreationIntent(lowerMsg, message) {
  if (isDeleteIntent(lowerMsg, message)) return false;
  const hasCreateVerb = /(?:add|create|new|register|insert|open)\b/i.test(message);
  const hasCustomerNoun = /\b(?:customer|account|client)\b/i.test(message);
  return hasCreateVerb && hasCustomerNoun;
}

/**
 * Robust check for Restock intent.
 */
function isRestockIntent(lowerMsg, message) {
  return (
    /(?:restock|re-stock|replenish)\b/i.test(message) ||
    /renew(?:\s+the)?\s+stock\b/i.test(message) ||
    /(?:add|order|increase)\s+stock\b/i.test(message)
  );
}

/**
 * Robust check for Read-only questions.
 */
function isQuestionOrInquiry(lowerMsg, message) {
  if (
    lowerMsg.includes("move ") ||
    isRestockIntent(lowerMsg, message || lowerMsg) ||
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
    lowerMsg.includes("who") ||
    lowerMsg.includes("can you check") ||
    lowerMsg.includes("view") ||
    lowerMsg.endsWith("?")
  );
}

// -------------------------------------------------------------
// MAIN CHAT AGENT EXECUTION
// -------------------------------------------------------------

export async function executeAgentChat(context, { agentId, message, conversationId }) {
  const startTime = Date.now();
  const lowerMsg = (message || "").toLowerCase().trim();

  // Load existing records strictly scoped by tenant
  const [products, leads, tasks, customers] = await Promise.all([
    storeAdapter.getProducts(context),
    storeAdapter.getLeads(context),
    storeAdapter.getTasks(context),
    storeAdapter.getCustomers(context),
  ]);

  let answer = "";
  const sources = [];
  const toolsUsed = [];
  let requiresConfirmation = false;
  let pendingAction = null;
  let executedAction = false;

  // Retrieve active conversation & workflow state for multi-turn continuity
  let currentWorkflow = null;
  if (conversationId) {
    currentWorkflow = await storeAdapter.getConversationState(context, conversationId);
  }

  // Check for active pending actions awaiting HITL confirmation
  const activePendingActions = await storeAdapter.getPendingActions(context);
  let activePending = null;
  if (conversationId) {
    if (currentWorkflow?.pendingActionId) {
      activePending = activePendingActions.find((a) => a.id === currentWorkflow.pendingActionId);
    }
  } else {
    activePending = activePendingActions.length > 0 ? activePendingActions[0] : null;
  }

  // =============================================================
  // STEP 1: HANDLE HITL CONFIRMATION / CANCELLATION
  // =============================================================
  if (isAffirmativeConfirmation(lowerMsg) || isNegativeCancellation(lowerMsg)) {
    if (!activePending) {
      executedAction = false;
      requiresConfirmation = false;
      answer = "There are no pending actions awaiting your confirmation.";
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, null);
      }
    } else if (isAffirmativeConfirmation(lowerMsg)) {
      toolsUsed.push("action_approver");
      try {
        const approvalRes = await storeAdapter.approvePendingAction(context, activePending.id);
        executedAction = true;
        requiresConfirmation = false;
        pendingAction = { ...activePending, status: "APPROVED" };

        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, null);
        }

        const actionType = activePending.actionType;
        const payload = activePending.payload || {};

        if (actionType === "CREATE_TASK") {
          answer = `Done. Task **${payload.title}** has been created in your CRM${payload.dueDate ? ` (Due: ${payload.dueDate})` : ""}.`;
        } else if (actionType === "CREATE_LEAD") {
          answer = `Done. Lead **${payload.title}** has been added to your CRM pipeline in stage *${payload.stage}*.`;
        } else if (actionType === "CREATE_CUSTOMER") {
          answer = `Done. Customer account #${payload.accountNo} (**${payload.name}**) has been created.`;
        } else if (actionType === "DELETE_LEAD") {
          answer = `Done. Lead **${payload.leadTitle || payload.title || "record"}** has been deleted from your CRM pipeline.`;
        } else if (actionType === "DELETE_PRODUCT") {
          answer = `Done. Product **${payload.productName || payload.name || "item"}** has been deleted from inventory.`;
        } else if (actionType === "DELETE_TASK") {
          answer = `Done. Task **${payload.taskTitle || payload.title || "task"}** has been deleted.`;
        } else if (actionType === "EDIT_LEAD") {
          const stageDesc = payload.toStage ? `moved to **${payload.toStage}**` : `updated`;
          answer = `Done. Lead **${payload.leadTitle}** has been ${stageDesc}.`;
        } else if (actionType === "RESTOCK_PRODUCT") {
          const newQty = approvalRes?.result?.product?.quantity ?? "updated";
          answer = `Done. Restocked **${payload.productName}** by **+${payload.quantityDelta} units**. Current stock is now **${newQty} units**.`;
        } else if (actionType === "EDIT_PRODUCT") {
          answer = `Done. Product **${payload.productName}** has been updated.`;
        } else {
          answer = `Done. The requested action (${actionType}) was approved and executed successfully.`;
        }
      } catch (err) {
        answer = `Failed to execute action: ${err.message}`;
      }
    } else {
      toolsUsed.push("action_rejector");
      await storeAdapter.rejectPendingAction(context, activePending.id);
      executedAction = false;
      requiresConfirmation = false;
      pendingAction = { ...activePending, status: "REJECTED" };
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, null);
      }
      answer = "Understood. I have cancelled the pending request. No changes were made.";
    }
  }

  // =============================================================
  // STEP 2: HANDLE ONGOING CONVERSATION WORKFLOW
  // (e.g. User was asked "Which lead would you like to delete?" and now provides title/ID)
  // =============================================================
  else if (
    currentWorkflow &&
    currentWorkflow.intent === "DELETE_LEAD" &&
    currentWorkflow.step === "AWAITING_LEAD_IDENTIFIER" &&
    !isTaskCreationIntent(lowerMsg, message) &&
    !isLeadCreationIntent(lowerMsg, message) &&
    !isQuestionOrInquiry(lowerMsg)
  ) {
    toolsUsed.push("crm_lead_deleter");
    const matchedLead = matchLeadFromText(message, leads);

    if (matchedLead) {
      requiresConfirmation = true;
      pendingAction = await storeAdapter.createPendingAction(context, {
        actionType: "DELETE_LEAD",
        title: `Delete Lead: ${matchedLead.title}`,
        summary: `Permanently delete lead "${matchedLead.title}" (ID: ${matchedLead.id}).`,
        payload: {
          leadId: matchedLead.id,
          leadTitle: matchedLead.title,
        },
      });
      answer = `I have prepared the request to delete lead **${matchedLead.title}** (ID: \`${matchedLead.id}\`).\n\nPlease confirm below before I permanently remove it from your CRM pipeline.`;
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, null);
      }
    } else {
      const activeLeadsList = leads.length > 0
        ? leads.slice(0, 5).map((l) => `• **${l.title}** (ID: \`${l.id}\`)`).join("\n")
        : "None";
      answer = `I could not find a lead matching "${message}" in your CRM pipeline.\n\nHere are your current active leads:\n${activeLeadsList}\n\nPlease specify the exact lead title or ID to delete.`;
    }
  }

  // 2B. Awaiting Lead for Task Creation (Multi-turn Example B)
  else if (
    currentWorkflow &&
    currentWorkflow.intent === "CREATE_TASK" &&
    currentWorkflow.step === "AWAITING_LEAD" &&
    !isQuestionOrInquiry(lowerMsg)
  ) {
    toolsUsed.push("crm_task_creator");
    const matchedLead = matchLeadFromText(message, leads);

    if (matchedLead) {
      requiresConfirmation = true;
      const dueDate = currentWorkflow.dueDate || new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const taskTitle = currentWorkflow.taskTitle || `Follow-up meeting with ${matchedLead.title}`;

      const payload = {
        title: taskTitle,
        description: taskTitle,
        status: "PENDING",
        priority: "HIGH",
        dueDate,
        due_date: dueDate,
        leadId: matchedLead.id,
        leadTitle: matchedLead.title,
      };

      pendingAction = await storeAdapter.createPendingAction(context, {
        actionType: "CREATE_TASK",
        title: `Create Task: ${taskTitle}`,
        summary: `Create task "${taskTitle}" for lead ${matchedLead.title} due on ${dueDate}.`,
        payload,
      });

      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          intent: "CREATE_TASK",
          step: "AWAITING_CONFIRMATION",
          data: payload,
          lastMentionedLeadId: matchedLead.id,
          lastMentionedLeadTitle: matchedLead.title,
        });
      }

      answer = `I have prepared the follow-up task for **${matchedLead.title}**:\n\n` +
        `• **Task:** ${taskTitle}\n` +
        `• **Associated Lead:** ${matchedLead.title} (\`${matchedLead.id}\`)\n` +
        `• **Due Date:** ${dueDate}\n` +
        `• **Priority:** HIGH\n\nPlease confirm below before I add this task to your CRM.`;
    } else {
      const activeLeadsList = leads.length > 0
        ? leads.slice(0, 5).map((l) => `• **${l.title}** (ID: \`${l.id}\`)`).join("\n")
        : "None";
      answer = `I could not find a lead matching "${message}".\n\nActive leads:\n${activeLeadsList}\n\nPlease specify which lead to associate with this task.`;
    }
  }

  // 2C. Awaiting Lead for Moving Stage (Multi-turn)
  else if (
    currentWorkflow &&
    currentWorkflow.intent === "MOVE_LEAD" &&
    currentWorkflow.step === "AWAITING_LEAD" &&
    !isQuestionOrInquiry(lowerMsg)
  ) {
    toolsUsed.push("crm_lead_stage_updater");
    const matchedLead = matchLeadFromText(message, leads);

    if (matchedLead) {
      const targetStage = currentWorkflow.targetStage || "Contacted";
      requiresConfirmation = true;
      pendingAction = await storeAdapter.createPendingAction(context, {
        actionType: "EDIT_LEAD",
        title: `Move Lead: ${matchedLead.title}`,
        summary: `Move "${matchedLead.title}" from stage ${matchedLead.stage} to ${targetStage}.`,
        payload: {
          leadId: matchedLead.id,
          leadTitle: matchedLead.title,
          fromStage: matchedLead.stage,
          toStage: targetStage,
          updates: { stage: targetStage },
        },
      });

      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          lastMentionedLeadId: matchedLead.id,
          lastMentionedLeadTitle: matchedLead.title,
        });
      }

      answer = `I have prepared the update to move **${matchedLead.title}** from stage *${matchedLead.stage}* to **${targetStage}**.\n\nPlease confirm below to proceed with updating this lead.`;
    } else {
      answer = `I could not find a lead matching "${message}". Please specify the lead title or ID.`;
    }
  }

  // 2D. Awaiting Product for Restock (Multi-turn)
  else if (
    currentWorkflow &&
    currentWorkflow.intent === "RESTOCK_PRODUCT" &&
    currentWorkflow.step === "AWAITING_PRODUCT" &&
    !isQuestionOrInquiry(lowerMsg)
  ) {
    toolsUsed.push("inventory_restock_orchestrator");
    const matchedProduct = matchProductFromText(message, products);

    if (matchedProduct) {
      const qtyMatch = message.match(/\b(?:by|with|add|plus|\+)\s*(\d+)\b/i) ||
        message.match(/\b(\d+)\s*(?:units?|pieces?|pcs?|items?|boxes?)\b/i) ||
        message.match(/\b(?:quantity|qty|amount)\s*[:=]?\s*(\d+)\b/i) ||
        message.match(/\b(\d+)\b/);
      const hasExplicitQuantity = Boolean(qtyMatch && parseInt(qtyMatch[1], 10) > 0);

      if (!hasExplicitQuantity) {
        answer = `How many units of **${matchedProduct.name}** would you like to restock? Please specify the quantity you want to add.`;
        requiresConfirmation = false;
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, {
            intent: "RESTOCK_PRODUCT",
            step: "AWAITING_QUANTITY",
            productId: matchedProduct.id,
            productName: matchedProduct.name,
          });
        }
      } else {
        const quantity = parseInt(qtyMatch[1], 10);
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "RESTOCK_PRODUCT",
          title: `Restock: ${matchedProduct.name}`,
          summary: `Renew stock for ${matchedProduct.name} (${matchedProduct.sku}) by +${quantity} units.`,
          payload: {
            productId: matchedProduct.id,
            sku: matchedProduct.sku,
            productName: matchedProduct.name,
            quantityDelta: quantity,
            quantity: quantity,
            changeType: "IN",
            reason: "User specified restocking quantity via AI assistant",
          },
        });

        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, null);
        }

        answer = `I have prepared the request to renew the stock of **${matchedProduct.name}** (**${matchedProduct.sku}**) by **+${quantity} units** (current stock: ${matchedProduct.quantity} units).\n\nPlease confirm below before I proceed.`;
      }
    } else {
      answer = `I could not find a product matching "${message}". Which product would you like to restock? Please specify the product name or SKU.`;
    }
  }

  // 2E. Awaiting Quantity for Restock (Multi-turn)
  else if (
    currentWorkflow &&
    currentWorkflow.intent === "RESTOCK_PRODUCT" &&
    currentWorkflow.step === "AWAITING_QUANTITY" &&
    !isQuestionOrInquiry(lowerMsg)
  ) {
    toolsUsed.push("inventory_restock_orchestrator");
    const qtyMatch = message.match(/\b(\d+)\b/);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 0;
    const matchedProduct = products.find((p) => p.id === currentWorkflow.productId) ||
      matchProductFromText(currentWorkflow.productName || "", products);

    if (matchedProduct && quantity > 0) {
      requiresConfirmation = true;
      pendingAction = await storeAdapter.createPendingAction(context, {
        actionType: "RESTOCK_PRODUCT",
        title: `Restock: ${matchedProduct.name}`,
        summary: `Renew stock for ${matchedProduct.name} (${matchedProduct.sku}) by +${quantity} units.`,
        payload: {
          productId: matchedProduct.id,
          sku: matchedProduct.sku,
          productName: matchedProduct.name,
          quantityDelta: quantity,
          quantity: quantity,
          changeType: "IN",
          reason: "User specified restocking quantity via AI assistant",
        },
      });

      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, null);
      }

      answer = `I have prepared the request to renew the stock of **${matchedProduct.name}** (**${matchedProduct.sku}**) by **+${quantity} units** (current stock: ${matchedProduct.quantity} units).\n\nPlease confirm below before I proceed.`;
    } else {
      answer = `Please specify a valid numeric quantity of units to restock.`;
    }
  }

  // =============================================================
  // STEP 3: DELETE RECORDS (TASK, LEAD, PRODUCT)
  // Evaluated BEFORE task/lead creation to avoid create-false-positives on delete commands!
  // e.g. "delete the task Follow up with Marcus Vance on AeroTech quotation"
  // "delete the lead #L-2357", "delete product Optoelectronic Sensor"
  // =============================================================
  else if (isDeleteIntent(lowerMsg, message)) {
    const isTaskDelete =
      /\b(?:task|todo|to-do)\b/i.test(message) ||
      (/\bfollow\s*-?\s*up\b/i.test(message) && matchTaskFromText(message, tasks) !== null);

    const isLeadDelete =
      !isTaskDelete &&
      (/\b(?:lead|deal|opportunity|prospect)\b/i.test(message) || extractLeadIdentifierCandidate(message) !== null);

    // 3A. Delete Task
    if (isTaskDelete) {
      toolsUsed.push("crm_task_deleter");
      const matchedTask = matchTaskFromText(message, tasks);
      if (matchedTask) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_TASK",
          title: `Delete Task: ${matchedTask.title}`,
          summary: `Delete task "${matchedTask.title}" from CRM.`,
          payload: {
            taskId: matchedTask.id,
            taskTitle: matchedTask.title,
          },
        });
        answer = `I have prepared the request to delete task **${matchedTask.title}**.\n\nPlease confirm below to proceed.`;
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, null);
        }
      } else {
        answer = "Which task would you like to delete? Please specify the task title or ID.";
      }
    }
    // 3B. Delete Lead
    else if (isLeadDelete) {
      toolsUsed.push("crm_lead_deleter");
      const matchedLead = matchLeadFromText(message, leads);
      const candidateId = extractLeadIdentifierCandidate(message);

      if (matchedLead) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_LEAD",
          title: `Delete Lead: ${matchedLead.title}`,
          summary: `Permanently delete lead "${matchedLead.title}" (ID: ${matchedLead.id}).`,
          payload: {
            leadId: matchedLead.id,
            leadTitle: matchedLead.title,
          },
        });
        answer = `I have prepared the request to delete lead **${matchedLead.title}** (ID: \`${matchedLead.id}\`).\n\nPlease confirm below before I permanently remove it.`;
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, null);
        }
      } else if (candidateId) {
        // Candidate was explicitly requested but does not exist in tenant's records
        const activeLeadsList = leads.length > 0
          ? leads.slice(0, 5).map((l) => `• **${l.title}** (ID: \`${l.id}\`)`).join("\n")
          : "None";
        answer = `I could not find a lead with ID or title **${candidateId}** in your CRM pipeline (it may have already been deleted).\n\nHere are your current active leads:\n${activeLeadsList}\n\nWhich lead would you like to delete?`;
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, {
            intent: "DELETE_LEAD",
            step: "AWAITING_LEAD_IDENTIFIER",
          });
        }
      } else {
        answer = "Which lead would you like to delete? Please specify the lead title or ID.";
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, {
            intent: "DELETE_LEAD",
            step: "AWAITING_LEAD_IDENTIFIER",
          });
        }
      }
    }
    // 3C. Delete Product
    else {
      toolsUsed.push("inventory_product_deleter");
      const matchedProduct = matchProductFromText(message, products);
      if (matchedProduct) {
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "DELETE_PRODUCT",
          title: `Delete Product: ${matchedProduct.name}`,
          summary: `Permanently delete ${matchedProduct.name} (${matchedProduct.sku}) from inventory.`,
          payload: {
            productId: matchedProduct.id,
            sku: matchedProduct.sku,
            productName: matchedProduct.name,
          },
        });
        answer = `I have prepared the request to delete **${matchedProduct.name}** (**${matchedProduct.sku}**).\n\nPlease confirm below before I permanently remove it from inventory.`;
      } else {
        const prodMatch = message.match(/(?:product|item)\s+([a-zA-Z0-9_\-\s]+)/i);
        const nameTried = prodMatch ? prodMatch[1].trim() : null;
        if (nameTried) {
          answer = `Product "${nameTried}" was not found in your inventory (it may have already been deleted).`;
        } else {
          answer = "Which item would you like to delete? Please specify the product name or SKU.";
        }
      }
    }
  }

  // =============================================================
  // STEP 4: CREATE TASK (CRITICAL FIX: Task vs Lead Confusion)
  // e.g. "Add a follow up task of meeting with the lead schedule on 30 sep 2026"
  // =============================================================
  else if (isTaskCreationIntent(lowerMsg, message)) {
    toolsUsed.push("crm_task_creator");

    // 1. Extract Due Date
    const dateInfo = extractDueDateFromText(message);
    const dueDate = dateInfo ? dateInfo.dateStr : new Date(Date.now() + 86400000).toISOString().split("T")[0];

    // 2. Extract Task Title / Description
    let titleCandidate = message
      .replace(/^(?:please\s+)?(?:can you\s+)?(?:add|create|new|schedule|set up|register|insert)\s+(?:a\s+)?(?:follow\s*-?\s*up\s+)?task\s+(?:to|for|of|named|about)?\s*/i, "")
      .trim();

    if (dateInfo) {
      // Remove date phrase including "schedule on", "scheduled on", "due on", "on"
      titleCandidate = titleCandidate
        .replace(new RegExp(`(?:schedule(?:d)?\\s+)?(?:on|by|due|for)?\\s*${dateInfo.rawMatched}`, "i"), "")
        .replace(/(?:schedule(?:d)?\s+on|due\s+on|on\s*$)/i, "")
        .trim();
    }

    // Clean up trailing punctuation or connecting prepositions
    titleCandidate = titleCandidate.replace(/^[,\-:\s]+|[,\-:\s]+$/g, "");
    if (!titleCandidate || titleCandidate.length < 3) {
      titleCandidate = "Meeting with the lead";
    }

    // Capitalize first letter
    const taskTitle = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);

    // 3. Search for any associated lead mentioned in text
    let associatedLead = null;
    for (const l of leads) {
      const lTitle = (l.title || l.name || "").toLowerCase();
      if (lTitle && lowerMsg.includes(lTitle)) {
        associatedLead = l;
        break;
      }
    }

    // If user generically asks to create a task "for my lead" without specifying title or schedule:
    const isGenericFollowUpForLead = /^(?:please\s+)?(?:can you\s+)?(?:add|create|new|schedule|set up)\s+(?:a\s+)?(?:follow\s*-?\s*up\s+)?task\s+(?:for|with)\s+(?:my|a|the)\s+lead\s*$/i.test(message.trim());
    if (isGenericFollowUpForLead && !associatedLead) {
      requiresConfirmation = false;
      answer = `Which lead would you like to create this follow-up task for? Please specify the lead title or ID.`;
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          intent: "CREATE_TASK",
          step: "AWAITING_LEAD",
          dueDate,
          taskTitle: "Follow-up meeting",
        });
      }
      return {
        answer,
        sources,
        toolsUsed,
        executionTimeMs: Date.now() - startTime,
        requiresConfirmation: false,
        pendingAction: null,
        executedAction: false,
        conversationId,
        executionMode: context.isDemo ? "DEMO" : "LIVE",
      };
    }

    if (!associatedLead && leads.length > 0) {
      associatedLead = leads[0];
    }

    const payload = {
      title: taskTitle,
      description: taskTitle,
      status: "PENDING",
      priority: "HIGH",
      dueDate,
      due_date: dueDate,
      leadId: associatedLead ? associatedLead.id : null,
      leadTitle: associatedLead ? associatedLead.title : null,
    };

    requiresConfirmation = true;
    pendingAction = await storeAdapter.createPendingAction(context, {
      actionType: "CREATE_TASK",
      title: `Create Task: ${taskTitle}`,
      summary: `Create task "${taskTitle}" due on ${dueDate}.`,
      payload,
    });

    if (conversationId) {
      await storeAdapter.setConversationState(context, conversationId, {
        intent: "CREATE_TASK",
        step: "AWAITING_CONFIRMATION",
        data: payload,
      });
    }

    answer = `I have prepared the follow-up task:\n\n` +
      `• **Task:** ${taskTitle}\n` +
      `• **Due Date:** ${dueDate}\n` +
      `• **Priority:** HIGH\n` +
      `• **Status:** PENDING\n` +
      (associatedLead ? `• **Associated Lead:** ${associatedLead.title} (\`${associatedLead.id}\`)\n` : "") +
      `\nPlease confirm below before I add this task to your CRM.`;
  }

  // =============================================================
  // STEP 4: CREATE LEAD (Strict Lead Creation, NOT Tasks)
  // e.g. "Create a new lead for ABC Company", "Add a lead called Global Fleet $100k"
  // =============================================================
  else if (isLeadCreationIntent(lowerMsg, message)) {
    toolsUsed.push("crm_lead_creator");

    // Extract title
    let title = "New Prospect Lead";
    const titleMatch = message.match(/(?:lead|deal|opportunity)\s+(?:for\s+|named\s+|called\s+)?([^,\n;]+)/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/(?:with|value|stage|amount|\$).*/i, "")
        .replace(/^(?:a\s+|an\s+|new\s+)+/i, "")
        .trim();
    }
    if (!title || title.length < 2) title = "New Prospect Lead";

    // Extract value safely: preceded by deal size/value/amount/worth/$
    let value = 0;
    const valueMatch = message.match(/(?:deal\s*size|value|amount|worth|size|\$)\s*[:=]?\s*\$?([0-9,]+(?:\.[0-9]+)?k?)/i) ||
      message.match(/\$([0-9,]+(?:\.[0-9]+)?k?)/i);

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

    if (conversationId) {
      await storeAdapter.setConversationState(context, conversationId, {
        intent: "CREATE_LEAD",
        step: "AWAITING_CONFIRMATION",
        lastMentionedLeadTitle: title,
      });
    }

    answer = `I have prepared the request to create lead **${title}** ($${value.toLocaleString()} — stage: *${stage}*).\n\nPlease confirm below to add this lead to your pipeline.`;
  }

  // =============================================================
  // STEP 5: CREATE CUSTOMER ACCOUNT
  // =============================================================
  else if (isCustomerCreationIntent(lowerMsg, message)) {
    toolsUsed.push("crm_customer_creator");

    let accountNo = "";
    const acctMatch = message.match(/(?:customer\s+account|account\s+no|account\s+number|account\s+#|account|acc\s+no)\s*[:#]?\s*([a-zA-Z0-9_-]+)/i);
    if (acctMatch) accountNo = acctMatch[1].trim();

    let industry = "";
    const indMatch = message.match(/(?:industry|domain|sector)\s*(?:is|:|=)\s*([^,\n;]+)/i);
    if (indMatch) industry = indMatch[1].trim();

    let primaryContact = "";
    const contactMatch = message.match(/(?:primary\s+contact|contact\s+person|contact|phone)\s*(?:is|:|=)\s*([^,\n;]+)/i);
    if (contactMatch) primaryContact = contactMatch[1].trim();

    let status = "ACTIVE";
    const statusMatch = message.match(/(?:status)\s*(?:is|:|=)?\s*([a-zA-Z]+)/i);
    if (statusMatch) status = statusMatch[1].trim().toUpperCase();

    let createdAt = new Date().toISOString();
    const dateMatch = message.match(/(?:created\s+on|created\s+at|created|date)\s*(?:is|:|=)?\s*([0-9\/\-\.]+)/i);
    if (dateMatch) {
      const rawDate = dateMatch[1].trim();
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) createdAt = parsed.toISOString();
    }

    let customerName = "";
    const nameMatch = message.match(/(?:for|named|called|company|name|title)\s*(?:is|:|=)?\s*([^,\n;]+)/i);
    if (nameMatch) {
      customerName = nameMatch[1].replace(/^(?:a\s+|an\s+|the\s+)+/i, "").trim();
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

    answer = `I have prepared the request to create a customer account with the following details:\n\n` +
      `• **Customer Account:** #${payload.accountNo} (${payload.name})\n` +
      `• **Industry / Domain:** ${payload.industry}\n` +
      `• **Primary Contact:** ${payload.phone || payload.contactName}\n` +
      `• **Status:** ${payload.status}\n\n` +
      `Please confirm below before I proceed with registering this customer account.`;
  }

  // =============================================================
  // STEP 6: MOVE LEAD TO NEW STAGE
  // e.g. "Move the National Courier Fleet Automation to stage Contacted"
  // =============================================================
  else if (
    (lowerMsg.includes("move") ||
      lowerMsg.includes("advance") ||
      lowerMsg.includes("shift") ||
      lowerMsg.includes("transfer") ||
      lowerMsg.includes("transition") ||
      lowerMsg.includes("promote") ||
      lowerMsg.includes("change stage") ||
      lowerMsg.includes("update stage")) &&
    (lowerMsg.includes("stage") || lowerMsg.includes("to") || lowerMsg.includes("into"))
  ) {
    toolsUsed.push("crm_lead_stage_updater");

    const stageInfo = extractStageFromText(message);
    let matchedLead = matchLeadFromText(message, leads);

    // If lead not found in current message, check conversation state for previously mentioned lead
    if (!matchedLead && currentWorkflow?.lastMentionedLeadId) {
      matchedLead = leads.find((l) => l.id === currentWorkflow.lastMentionedLeadId);
    }

    if (!stageInfo || !stageInfo.canonical) {
      const invalidStage = stageInfo?.raw || "unknown";
      answer = `"${invalidStage}" is not a valid CRM stage. Valid stages are: ${CRM_VALID_STAGES.join(", ")}. Please specify one of these stages.`;
      requiresConfirmation = false;
    } else if (!matchedLead) {
      answer = `Which lead would you like to move to **${stageInfo.canonical}**? Please specify the lead title or ID.`;
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          intent: "MOVE_LEAD",
          step: "AWAITING_LEAD",
          targetStage: stageInfo.canonical,
        });
      }
    } else {
      requiresConfirmation = true;
      pendingAction = await storeAdapter.createPendingAction(context, {
        actionType: "EDIT_LEAD",
        title: `Move Lead: ${matchedLead.title}`,
        summary: `Move "${matchedLead.title}" from stage ${matchedLead.stage} to ${stageInfo.canonical}.`,
        payload: {
          leadId: matchedLead.id,
          leadTitle: matchedLead.title,
          fromStage: matchedLead.stage,
          toStage: stageInfo.canonical,
          updates: { stage: stageInfo.canonical },
        },
      });

      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          lastMentionedLeadId: matchedLead.id,
          lastMentionedLeadTitle: matchedLead.title,
        });
      }

      answer = `I have prepared the update to move **${matchedLead.title}** from stage *${matchedLead.stage}* to **${stageInfo.canonical}**.\n\nPlease confirm below to proceed with updating this lead.`;
    }
  }

  // =============================================================
  // STEP 7: RESTOCK / RENEW PRODUCT
  // e.g. "renew the stock of Brushless Motor by 20 units"
  // =============================================================
  else if (isRestockIntent(lowerMsg, message)) {
    toolsUsed.push("inventory_restock_orchestrator");
    const matchedProduct = matchProductFromText(message, products);

    if (!matchedProduct) {
      answer = "Which product would you like to restock? Please specify the product name or SKU.";
      requiresConfirmation = false;
      if (conversationId) {
        await storeAdapter.setConversationState(context, conversationId, {
          intent: "RESTOCK_PRODUCT",
          step: "AWAITING_PRODUCT",
        });
      }
    } else {
      // Remove product name and SKU from message text to avoid matching model numbers (e.g. v2, 24V, 400W)
      let textWithoutProduct = message;
      if (matchedProduct.name) {
        textWithoutProduct = textWithoutProduct.replace(new RegExp(matchedProduct.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
      }
      if (matchedProduct.sku) {
        textWithoutProduct = textWithoutProduct.replace(new RegExp(matchedProduct.sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
      }

      const qtyMatch = textWithoutProduct.match(/\b(?:by|with|add|plus|\+)\s*(\d+)\b/i) ||
        textWithoutProduct.match(/\b(\d+)\s*(?:units?|pieces?|pcs?|items?|boxes?)\b/i) ||
        textWithoutProduct.match(/\b(?:quantity|qty|amount)\s*[:=]?\s*(\d+)\b/i) ||
        textWithoutProduct.match(/\b(\d+)\b/);
      const hasExplicitQuantity = Boolean(qtyMatch && parseInt(qtyMatch[1], 10) > 0);

      if (!hasExplicitQuantity) {
        answer = `How many units of **${matchedProduct.name}** would you like to restock? Please specify the quantity you want to add.`;
        requiresConfirmation = false;
        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, {
            intent: "RESTOCK_PRODUCT",
            step: "AWAITING_QUANTITY",
            productId: matchedProduct.id,
            productName: matchedProduct.name,
          });
        }
      } else {
        const quantity = parseInt(qtyMatch[1], 10);
        requiresConfirmation = true;
        pendingAction = await storeAdapter.createPendingAction(context, {
          actionType: "RESTOCK_PRODUCT",
          title: `Restock: ${matchedProduct.name}`,
          summary: `Renew stock for ${matchedProduct.name} (${matchedProduct.sku}) by +${quantity} units.`,
          payload: {
            productId: matchedProduct.id,
            sku: matchedProduct.sku,
            productName: matchedProduct.name,
            quantityDelta: quantity,
            quantity: quantity,
            changeType: "IN",
            reason: "User requested restocking via AI assistant",
          },
        });

        answer = `I have prepared the request to renew the stock of **${matchedProduct.name}** (**${matchedProduct.sku}**) by **+${quantity} units** (current stock: ${matchedProduct.quantity} units).\n\nPlease confirm below before I proceed.`;
      }
    }
  }



  // =============================================================
  // STEP 9: EDIT RECORDS (PRODUCT, LEAD, TASK)
  // e.g. "edit the price of Brushless Motor to $299", "edit lead National Courier value to $150000"
  // =============================================================
  else if (
    lowerMsg.includes("edit") ||
    lowerMsg.includes("update") ||
    lowerMsg.includes("modify") ||
    lowerMsg.includes("change price") ||
    lowerMsg.includes("change value")
  ) {
    if (lowerMsg.includes("lead") || lowerMsg.includes("deal")) {
      toolsUsed.push("crm_lead_updater");
      let matchedLead = matchLeadFromText(message, leads);

      // Support editing a previously mentioned lead
      if (!matchedLead && currentWorkflow?.lastMentionedLeadId) {
        matchedLead = leads.find((l) => l.id === currentWorkflow.lastMentionedLeadId);
      }

      if (matchedLead) {
        const updates = {};
        const valMatch = message.match(/(?:value|deal|amount|\$)\s*[:=]?\s*\$?([0-9,]+(?:\.[0-9]+)?k?)/i);
        if (valMatch) {
          let raw = valMatch[1].replace(/,/g, "").toLowerCase();
          let mult = 1;
          if (raw.endsWith("k")) { mult = 1000; raw = raw.replace("k", ""); }
          const p = parseFloat(raw) * mult;
          if (!isNaN(p)) updates.value = p;
        }

        const stageInfo = extractStageFromText(message);
        if (stageInfo && stageInfo.canonical) {
          updates.stage = stageInfo.canonical;
        }

        const changesSummary = Object.entries(updates)
          .map(([k, v]) => `${k} to ${v}`)
          .join(", ") || "requested properties";

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

        if (conversationId) {
          await storeAdapter.setConversationState(context, conversationId, {
            lastMentionedLeadId: matchedLead.id,
            lastMentionedLeadTitle: matchedLead.title,
          });
        }

        answer = `I have prepared the update for lead **${matchedLead.title}** (${changesSummary}).\n\nPlease confirm below to proceed.`;
      } else {
        answer = "Which lead would you like to edit? Please specify the lead title or ID.";
      }
    } else if (lowerMsg.includes("task")) {
      toolsUsed.push("crm_task_updater");
      const matchedTask = matchTaskFromText(message, tasks);
      if (matchedTask) {
        const updates = {};
        if (lowerMsg.includes("complete") || lowerMsg.includes("done")) {
          updates.status = "COMPLETED";
        }
        const dateInfo = extractDueDateFromText(message);
        if (dateInfo) updates.dueDate = dateInfo.dateStr;

        const changesSummary = Object.entries(updates)
          .map(([k, v]) => `${k} to ${v}`)
          .join(", ") || "requested properties";

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
  // STEP 10: READ-ONLY INQUIRIES & QUERIES
  // =============================================================
  // 10A. Low Stock Inquiry
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

  // 10B. General Stock / Inventory Query
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

  // 10C. CRM Leads Query
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

  // 10D. Tasks Query
  else if (lowerMsg.includes("task")) {
    toolsUsed.push("crm_task_tracker");
    const pending = tasks.filter((t) => t.status === "PENDING");
    const completed = tasks.filter((t) => t.status === "COMPLETED");

    answer = `You have **${tasks.length} task(s)** (${pending.length} pending, ${completed.length} completed):\n\n` +
      tasks.slice(0, 5).map((t) => `• **${t.title}** [${t.status}] — Priority: ${t.priority}`).join("\n");
  }

  // =============================================================
  // STEP 11: GENERAL AI REASONING WITH MEM0 MEMORY RECALL
  // =============================================================
  if (!answer) {
    // Token-efficient memory recall (max 3 relevant memories)
    let memoriesContext = "";
    try {
      const recalled = await memoryService.recall(context, { query: message, limit: 3 });
      if (recalled && recalled.length > 0) {
        memoriesContext = `\nRelevant User Context & Preferences:\n${recalled.map((m) => `- ${m}`).join("\n")}\n`;
      }
    } catch (e) {
      console.warn("Memory recall in agent failed:", e.message);
    }

    const systemPrompt = `You are a helpful, direct supply chain assistant for ${context.user?.tenantName || "SmartSupply"}.
User: ${context.user?.name || "User"}
Execution Mode: ${context.mode}
Available Products: ${products.length} items
Active Leads: ${leads.length} leads (Valid stages: ${CRM_VALID_STAGES.join(", ")})
${memoriesContext}
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

      await neonDb.addMessageToDb(context.user.tenantId, finalConvId, {
        sender: "USER",
        content: message,
      });

      await neonDb.addMessageToDb(context.user.tenantId, finalConvId, {
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
    if (!conv.messages) conv.messages = [];

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

  if (finalConvId && pendingAction && pendingAction.id) {
    const existingWorkflow = (await storeAdapter.getConversationState(context, finalConvId)) || {};
    await storeAdapter.setConversationState(context, finalConvId, {
      ...existingWorkflow,
      pendingActionId: pendingAction.id,
    });
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
