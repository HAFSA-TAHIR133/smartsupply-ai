/**
 * Client-Side Mock AI Engine for SmartSupply Demo Mode.
 * Processes natural language requests locally in the browser,
 * enforces client-side guardrails and session rate limiting,
 * updates local demo state, and returns rich simulated agent responses
 * without making external network calls or exposing secret LLM keys.
 */

import { checkDemoGuardrails } from "./demoGuardrails.js";
import {
  getDemoStore,
  createDemoCustomer,
  adjustDemoStock,
  createDemoLead,
  updateDemoLead,
  createDemoTask,
  getDemoTasks,
  deleteDemoTask,
  createDemoProduct,
  getDemoProducts,
  getDemoCustomers,
  getDemoLeads,
  getAiCommandCount,
  incrementAiCommandCount,
  DEMO_MAX_AI_ACTIONS,
} from "./demoStore.js";

/**
 * Executes a simulated AI agent prompt on the client side.
 * @param {string} agentId - The selected agent identifier
 * @param {string} prompt - The user prompt string
 * @param {string} [conversationId] - Optional conversation ID
 */
export async function executeMockAiAgent(agentId, prompt, conversationId) {
  const cleanPrompt = (prompt || "").trim();

  // 1. Enforce Client-Side Security Guardrails
  const guardrailCheck = checkDemoGuardrails(cleanPrompt);
  if (!guardrailCheck.allowed) {
    const error = new Error("Action rejected by Demo Guardrails");
    error.status = 400;
    error.code = guardrailCheck.code || "GUARDRAIL_REJECTED";
    error.reason = guardrailCheck.reason;
    error.guardrailRejected = true;
    throw error;
  }

  // 2. Enforce Client-Side Session Rate Limiting (Max 10 AI commands)
  const currentCount = getAiCommandCount();
  if (currentCount >= DEMO_MAX_AI_ACTIONS) {
    const error = new Error("Demo limit reached. Sign up for a real trial account to continue");
    error.status = 429;
    error.code = "DEMO_RATE_LIMIT_EXCEEDED";
    error.rateLimitReached = true;
    error.maxAllowed = DEMO_MAX_AI_ACTIONS;
    throw error;
  }

  // Increment session counter
  const newCount = incrementAiCommandCount();

  // If this was the 10th action, signal global freeze modal
  if (newCount >= DEMO_MAX_AI_ACTIONS && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("smartsupply:demo-locked", {
        detail: { count: newCount, timestamp: Date.now() },
      })
    );
  }

  // Zero-cost client execution: response in <10ms
  await new Promise((r) => setTimeout(r, 4));

  const convId = conversationId || `conv-demo-${Date.now()}`;
  const lower = cleanPrompt.toLowerCase();

  // 3. Natural Language Intent Parsing & Local State Execution

  // Intent A: Create Customer
  // e.g. "Create a customer named Quantum Dynamics", "Add customer Acme Corp", "New customer ..."
  const customerCreateMatch =
    cleanPrompt.match(/(?:create|add|register|new)\s+(?:a\s+)?customer(?:\s+named|\s+called|\s*:)?\s+["']?([^"',.\n]+)["']?/i) ||
    cleanPrompt.match(/customer\s+["']?([^"',.\n]+)["']?\s+(?:with|company)/i);

  if (customerCreateMatch) {
    const customerName = customerCreateMatch[1].trim();
    const createdCustomer = createDemoCustomer({
      name: customerName,
      company: customerName,
      email: `contact@${customerName.toLowerCase().replace(/[^a-z0-9]/g, "") || "partner"}.com`,
      phone: "+1 (555) 740-9128",
      industry: "Manufacturing & Supply",
      totalSpend: 0,
    });

    return {
      conversationId: convId,
      answer: `I have successfully registered customer **${createdCustomer.name}** in your local demo workspace. Account **${createdCustomer.accountNo}** is active and visible in your CRM pipeline.`,
      sources: ["SmartSupply Local CRM Sandbox", "Account Provisioning Policy"],
      toolsUsed: ["crm_create_customer"],
      executionTimeMs: 142,
      executedAction: {
        type: "CREATE_CUSTOMER",
        target: createdCustomer.name,
        result: createdCustomer,
      },
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  // Intent B: Stock Adjustment / Restock
  // e.g. "Dedict 4 units from motor", "Reduce 4 units from brushless motor stock", "soo cut out the 4 units from it", "make the units 56"
  const adjustStockMatch =
    lower.includes("stock") ||
    lower.includes("restock") ||
    lower.includes("replenish") ||
    lower.includes("deduct") ||
    lower.includes("dedict") ||
    lower.includes("reduce") ||
    lower.includes("cut out") ||
    lower.includes("cutoff") ||
    lower.includes("cut off") ||
    lower.includes("remove") ||
    lower.includes("take out") ||
    lower.includes("subtract") ||
    lower.includes("minus") ||
    lower.includes("units") ||
    lower.includes("motor") ||
    lower.includes("motot");

  if (adjustStockMatch) {
    const products = getDemoProducts();
    const normalizedPrompt = lower
      .replace(/\bmotot\b/g, "motor")
      .replace(/\bbattey\b/g, "battery")
      .replace(/\bbrushles\b/g, "brushless")
      .replace(/\bdedict\b/g, "deduct");

    // Try to find matching product
    let targetProduct = products.find(
      (p) => normalizedPrompt.includes(p.name.toLowerCase()) || normalizedPrompt.includes(p.sku.toLowerCase())
    );

    if (!targetProduct) {
      if (normalizedPrompt.includes("motor")) targetProduct = products.find((p) => p.sku === "MTR-BRSH-024") || products[0];
      else if (normalizedPrompt.includes("battery") || normalizedPrompt.includes("polymer")) targetProduct = products.find((p) => p.sku === "BAT-LIPO-4820");
      else if (normalizedPrompt.includes("sensor")) targetProduct = products.find((p) => p.sku === "SEN-OPTO-005");
      else if (normalizedPrompt.includes("bolt") || normalizedPrompt.includes("titanium")) targetProduct = products.find((p) => p.sku === "FST-TI-M840");
      else if (normalizedPrompt.includes("plate") || normalizedPrompt.includes("carbon")) targetProduct = products.find((p) => p.sku === "MAT-CF-5050");
      else if (normalizedPrompt.includes(" it") || normalizedPrompt.includes("from it")) {
        const lastId = typeof window !== "undefined" ? localStorage.getItem("smartsupply_demo_last_product_id") : null;
        targetProduct = (lastId && products.find((p) => p.id === lastId)) || products[0];
      } else {
        targetProduct = products[0];
      }
    }

    if (targetProduct && typeof window !== "undefined") {
      try {
        localStorage.setItem("smartsupply_demo_last_product_id", targetProduct.id);
      } catch (e) {}
    }

    const isDeduct =
      normalizedPrompt.includes("deduct") ||
      normalizedPrompt.includes("reduce") ||
      normalizedPrompt.includes("cut out") ||
      normalizedPrompt.includes("cutoff") ||
      normalizedPrompt.includes("cut off") ||
      normalizedPrompt.includes("remove") ||
      normalizedPrompt.includes("take out") ||
      normalizedPrompt.includes("subtract") ||
      normalizedPrompt.includes("minus") ||
      normalizedPrompt.includes("out") ||
      normalizedPrompt.includes("ship");

    let changeType = isDeduct ? "OUT" : "IN";

    // Extract quantity delta or target
    let qty = 4;
    const targetMatch = cleanPrompt.match(/(?:make|set|change|update)\s+(?:the\s+)?(?:units?|stock|quantity)\s+(?:to|=)?\s*(\d+)/i) ||
      cleanPrompt.match(/make\s+(?:the\s+)?units?\s+(\d+)/i);

    const deltaMatch = cleanPrompt.match(/(?:deduct|dedict|reduce|cutoff|cut\s*off|cut\s*out|take\s*out|remove|add|plus|renew|restock|by|with|\-|\+)\s*(?:the)?\s*(\d+)\b/i) ||
      cleanPrompt.match(/\b(\d+)\s*(?:units?|pcs?|pieces?|items?|boxes?)\b/i);

    if (deltaMatch && parseInt(deltaMatch[1], 10) > 0) {
      qty = parseInt(deltaMatch[1], 10);
    } else if (targetMatch && targetProduct) {
      const targetQty = parseInt(targetMatch[1], 10);
      const currentQty = Number(targetProduct.quantity || 0);
      if (targetQty < currentQty) {
        qty = currentQty - targetQty;
        changeType = "OUT";
      } else {
        qty = targetQty - currentQty;
        changeType = "IN";
      }
    }

    if (targetProduct) {
      const adjustmentResult = adjustDemoStock(targetProduct.id, {
        quantity: qty,
        changeType,
        reason: "Autonomous Demo Agent adjustment",
      });

      return {
        conversationId: convId,
        answer: `Executed stock adjustment for **${targetProduct.name}** (SKU: \`${targetProduct.sku}\`):\n\n- **Action**: ${changeType === "IN" ? "Restock (+)" : "Outflow (-)"} ${qty} units\n- **Previous Stock**: ${adjustmentResult.previousQuantity}\n- **Current Stock**: ${adjustmentResult.newQuantity} units\n\nInventory levels and valuation have been synchronized immediately across your workspace.`,
        sources: ["Autonomous Warehouse Controller", "Live Stock Ledger"],
        toolsUsed: ["inventory_adjust_stock"],
        executionTimeMs: 168,
        executedAction: {
          type: "ADJUST_STOCK",
          target: targetProduct.name,
          result: adjustmentResult,
        },
        remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
      };
    }
  }

  // Intent C: Create or Move Lead
  // e.g. "Create lead for Solar Panel Project", "Move lead National Courier to Won"
  if (lower.includes("lead") || lower.includes("deal") || lower.includes("opportunity") || /^\s*\$?[0-9,]{2,}(?:\.[0-9]+)?k?\s*$/i.test(cleanPrompt) || lower.includes("deal value will be")) {
    const leads = getDemoLeads();

    if (lower.includes("won") || lower.includes("qualified") || lower.includes("proposal") || lower.includes("contacted")) {
      let targetLead = leads.find((l) => lower.includes(l.title.toLowerCase()) || lower.includes(l.companyName.toLowerCase()));
      if (!targetLead && leads.length > 0) targetLead = leads[0];

      const newStage = lower.includes("won")
        ? "Won"
        : lower.includes("proposal")
        ? "Proposal"
        : lower.includes("qualified")
        ? "Qualified"
        : "Contacted";

      if (targetLead) {
        const updated = updateDemoLead(targetLead.id, { stage: newStage });
        return {
          conversationId: convId,
          answer: `Successfully updated **${targetLead.title}** stage to **${newStage}**. Pipeline valuation and CRM Kanban distribution have updated in real time.`,
          sources: ["CRM Deal Pipeline", "Lead Stage Flow Controller"],
          toolsUsed: ["crm_update_lead_stage"],
          executionTimeMs: 135,
          executedAction: {
            type: "UPDATE_LEAD",
            target: targetLead.title,
            result: updated,
          },
          remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
        };
      }
    }

    // Lead creation or value assignment
    const leadTitleMatch = cleanPrompt.match(/(?:create|add|new)\s+(?:a\s+)?lead(?:\s+for|\s+called|\s*:)?\s+["']?([^"',.\n]+)["']?/i);
    let leadTitle = leadTitleMatch ? leadTitleMatch[1].replace(/^(?:for\s+|called\s+|named\s+|of\s+|a\s+|an\s+|the\s+)+/gi, "").trim() : "";
    if (!leadTitle && (lower.includes("drone supply") || lower.includes("autonomous drone"))) {
      leadTitle = "Autonomous Drone Supply";
    }
    if (!leadTitle) leadTitle = "Autonomous Drone Supply";

    let leadValue = 95000;
    const valueMatch = cleanPrompt.match(/(?:value\s*(?:will\s+be|is)?\s*|\$)?([0-9]{2,}(?:,[0-9]{3})*(?:\.[0-9]+)?k?)/i);
    if (valueMatch && !isNaN(parseFloat(valueMatch[1].replace(/,/g, "")))) {
      let raw = valueMatch[1].replace(/,/g, "").toLowerCase();
      let mult = raw.endsWith("k") ? 1000 : 1;
      leadValue = parseFloat(raw.replace("k", "")) * mult;
    }

    const createdLead = createDemoLead({
      title: leadTitle,
      companyName: `${leadTitle} Enterprises`,
      contactName: "Alex Reynolds",
      value: leadValue,
      stage: "Qualified",
      notes: "Generated via SmartSupply Demo AI Assistant",
    });

    return {
      conversationId: convId,
      answer: `New lead **${createdLead.title}** valued at **$${createdLead.value.toLocaleString()}** was created and assigned to stage **Qualified**.`,
      sources: ["CRM Deal Pipeline"],
      toolsUsed: ["crm_create_lead"],
      executionTimeMs: 145,
      executedAction: {
        type: "CREATE_LEAD",
        target: createdLead.title,
        result: createdLead,
      },
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  // Intent D: Task Deletion
  if ((lower.includes("delete") || lower.includes("remove") || lower.includes("cancel")) && (lower.includes("task") || lower.includes("folow") || lower.includes("follow"))) {
    const tasks = getDemoTasks();
    const taskMatch = tasks.find((t) => {
      const tLower = (t.title || "").toLowerCase();
      if (lower.includes("aeropax") && tLower.includes("aeropax")) return true;
      const words = tLower.split(/\s+/).filter((w) => w.length > 3);
      return words.some((w) => lower.includes(w));
    }) || (tasks.length > 0 ? tasks[0] : null);

    if (taskMatch) {
      deleteDemoTask(taskMatch.id);
      return {
        conversationId: convId,
        answer: `Confirmed & executed successfully!\n\nDeleted task **${taskMatch.title}** from your CRM.`,
        sources: ["CRM Operational Task Engine"],
        toolsUsed: ["crm_task_deleter"],
        executionTimeMs: 125,
        executedAction: {
          type: "DELETE_TASK",
          target: taskMatch.title,
          result: { id: taskMatch.id, success: true },
        },
        remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
      };
    }
  }

  // Intent E: Create Task
  if (lower.includes("task") || lower.includes("remind") || lower.includes("follow up") || lower.includes("folow up")) {
    const isUrgent = lower.includes("urgent") || lower.includes("critical") || lower.includes("asap") || lower.includes("high");

    let leadRef = "";
    if (lower.includes("drone supply") || lower.includes("autonomous drone")) {
      leadRef = "Autonomous Drone Supply";
    } else if (lower.includes("awaan")) {
      leadRef = "Awaan Industries";
    } else if (lower.includes("aeropax")) {
      leadRef = "Aeropax";
    }

    let dueDate = "2026-09-30";
    if (lower.includes("30 sep") || lower.includes("30th sep") || lower.includes("30 sepetember") || lower.includes("30 september")) {
      dueDate = "2026-09-30";
    } else {
      dueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    }

    let timeStr = "";
    if (lower.includes("8a.m") || lower.includes("8am") || lower.includes("8 a.m")) {
      timeStr = "8:00 AM";
    } else if (lower.includes("4.m") || lower.includes("4p.m") || lower.includes("4pm") || lower.includes("4 p.m")) {
      timeStr = "4:00 PM";
    }

    let titleCandidate = cleanPrompt
      .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:add|create|new|schedule|set\s*up|register|insert)\s+(?:an?\s+|the\s+)?(?:urgent\s+|critical\s+|high\s*priority\s+)?(?:fol{1,2}ow\s*-?\s*up\s+)?task\s+(?:to|for|of|named|about)?\s*/i, "")
      .trim();

    titleCandidate = titleCandidate
      .replace(/(?:at\s+)?(?:8\s*a\.?m\.?|4\s*\.?m|4\s*p\.?m\.?)/gi, "")
      .replace(/(?:on\s+)?(?:30(?:th)?\s+(?:sep|sept|september|sepetember)(?:\s+2026)?)/gi, "")
      .replace(/^[,\-:\s]+|[,\-:\s]+$/g, "")
      .trim();

    if (!titleCandidate || titleCandidate.length < 3) {
      if (lower.includes("warehouse safety audit")) {
        titleCandidate = "Warehouse safety audit";
      } else if (leadRef) {
        titleCandidate = `Meeting with ${leadRef}`;
      } else {
        titleCandidate = "Operational task";
      }
    }

    let finalTitle = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
    if (timeStr && !finalTitle.includes(timeStr)) {
      finalTitle = `${finalTitle} at ${timeStr}`;
    }

    const newTask = createDemoTask({
      title: finalTitle,
      priority: isUrgent ? "HIGH" : "MEDIUM",
      dueDate,
      status: "PENDING",
    });

    return {
      conversationId: convId,
      answer: `Task scheduled: **${newTask.title}** (Priority: **${newTask.priority}**, Due: **${newTask.dueDate}**)${leadRef ? ` associated with lead **${leadRef}**` : ""}. Track progress on your CRM Tasks board.`,
      sources: ["Operational Task Scheduler"],
      toolsUsed: ["crm_task_creator"],
      executionTimeMs: 120,
      executedAction: {
        type: "CREATE_TASK",
        target: newTask.title,
        result: newTask,
      },
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  // Intent F: Create Stock Item / Product with Price Check
  if (lower.includes("stock item") || lower.includes("new stock") || (lower.includes("create") && lower.includes("product"))) {
    const hasPrice = /(?:\$|price|cost|\b\d+\s*dollars?\b)/i.test(cleanPrompt);
    const nameMatch = cleanPrompt.match(/(?:item|product|stock\s+of)\s+([a-zA-Z0-9\s\-]+?)(?:\s+\d+|\s+with|\s+at|\$|$)/i);
    const prodName = nameMatch && nameMatch[1].trim().length >= 2 ? nameMatch[1].trim() : "New Product";

    if (!hasPrice) {
      return {
        conversationId: convId,
        answer: `What is the unit price for **${prodName}** (e.g., $29.99)? Please provide the unit price so I can register this item in your inventory.`,
        sources: ["Inventory Pricing Master"],
        toolsUsed: ["inventory_product_creator"],
        executionTimeMs: 110,
        remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
      };
    }

    const priceMatch = cleanPrompt.match(/(?:\$|price\s*is\s*|cost\s*is\s*|\$)\s*(\d+(?:\.\d+)?)/i);
    const unitPrice = priceMatch ? parseFloat(priceMatch[1]) : 29.99;
    const qtyMatch = cleanPrompt.match(/(\d+)\s*(?:units?|items?|pcs?|pieces?)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;

    const newProd = createDemoProduct({
      name: prodName,
      quantity,
      unitPrice,
      reorderPoint: 10,
      category: "Electronics",
    });

    return {
      conversationId: convId,
      answer: `Successfully registered new stock item **${newProd.name}** (${newProd.quantity} units at **$${newProd.unitPrice.toFixed(2)}/unit**, SKU: \`${newProd.sku}\`). Stock valuation and catalog have updated in real time.`,
      sources: ["Warehouse Stock Master", "Inventory Valuation Engine"],
      toolsUsed: ["inventory_product_creator"],
      executionTimeMs: 135,
      executedAction: {
        type: "CREATE_PRODUCT",
        target: newProd.name,
        result: newProd,
      },
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  // Intent E: Informational / Read-Only queries
  if (lower.includes("inventory") || lower.includes("low stock") || lower.includes("critical") || lower.includes("what items")) {
    const products = getDemoProducts();
    const lowStock = products.filter(
      (p) => (p.quantity ?? p.current_stock ?? 0) <= (p.reorderPoint ?? p.min_stock_threshold ?? 10)
    );

    const summary = lowStock
      .map(
        (p) =>
          `- **${p.name}** (SKU: \`${p.sku}\`): **${p.quantity ?? p.current_stock}** in stock (threshold: ${p.reorderPoint ?? p.min_stock_threshold})`
      )
      .join("\n");

    return {
      conversationId: convId,
      answer: `Here is the current inventory status from your warehouse:\n\n${summary || "All items currently maintain healthy stock levels above minimum thresholds."}\n\nWould you like me to create an autonomous restock task or purchase order?`,
      sources: ["Warehouse Inventory Master", "Safety Stock Policy v2.4"],
      toolsUsed: ["inventory_query_stock"],
      executionTimeMs: 110,
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  if (lower.includes("customer") || lower.includes("clients")) {
    const customers = getDemoCustomers();
    const list = customers.map((c) => `- **${c.name}** (${c.accountNo}) — Total Spend: $${(c.totalSpend || 0).toLocaleString()}`).join("\n");
    return {
      conversationId: convId,
      answer: `Active customers in your demo account:\n\n${list}\n\nYou can ask me to create a customer, update contact details, or link a new proposal.`,
      sources: ["CRM Customer Registry"],
      toolsUsed: ["crm_query_customers"],
      executionTimeMs: 95,
      remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
    };
  }

  // Default intelligent assistant response
  return {
    conversationId: convId,
    answer: `I have analyzed your request regarding **"${cleanPrompt}"**. All operations in Demo Mode execute instantly within your isolated client sandbox. You can ask me to **create customers**, **adjust warehouse stock**, **advance leads through your pipeline**, or **query real-time metrics**.`,
    sources: ["SmartSupply AI Strategic Agent Core"],
    toolsUsed: ["agent_planner"],
    executionTimeMs: 118,
    remainingCommands: DEMO_MAX_AI_ACTIONS - newCount,
  };
}
