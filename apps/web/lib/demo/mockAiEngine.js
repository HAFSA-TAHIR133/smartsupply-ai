/**
 * Client-Side Mock AI Engine for SmartSupply Demo Mode.
 * Processes natural language requests locally in the browser,
 * enforces client-side guardrails and session rate limiting,
 * updates local demo state, and returns rich simulated agent responses
 * without making external network calls or exposing secret LLM keys.
 */

import { checkDemoGuardrails } from "./demoGuardrails";
import {
  getDemoStore,
  createDemoCustomer,
  adjustDemoStock,
  createDemoLead,
  updateDemoLead,
  createDemoTask,
  getDemoProducts,
  getDemoCustomers,
  getDemoLeads,
  getAiCommandCount,
  incrementAiCommandCount,
  DEMO_MAX_AI_ACTIONS,
} from "./demoStore";

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
  // e.g. "Adjust stock for Brushless Motor", "Restock 50 units of motor", "Add 25 units to titanium bolts"
  const adjustStockMatch =
    lower.includes("stock") ||
    lower.includes("restock") ||
    lower.includes("replenish") ||
    lower.includes("deduct") ||
    lower.includes("units");

  if (adjustStockMatch) {
    const products = getDemoProducts();
    // Try to find matching product
    let targetProduct = products.find(
      (p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.sku.toLowerCase())
    );

    if (!targetProduct) {
      if (lower.includes("motor")) targetProduct = products.find((p) => p.sku === "MTR-BRSH-024");
      else if (lower.includes("battery") || lower.includes("polymer")) targetProduct = products.find((p) => p.sku === "BAT-LIPO-4820");
      else if (lower.includes("sensor")) targetProduct = products.find((p) => p.sku === "SEN-OPTO-005");
      else if (lower.includes("bolt") || lower.includes("titanium")) targetProduct = products.find((p) => p.sku === "FST-TI-M840");
      else if (lower.includes("plate") || lower.includes("carbon")) targetProduct = products.find((p) => p.sku === "MAT-CF-5050");
      else targetProduct = products[0]; // fallback to first item
    }

    // Extract quantity delta
    const qtyMatch = cleanPrompt.match(/\b(\d+)\s*(?:units|pcs|items|boxes)?\b/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 25;
    const isDeduct = lower.includes("deduct") || lower.includes("remove") || lower.includes("out") || lower.includes("ship");
    const changeType = isDeduct ? "OUT" : "IN";

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
  if (lower.includes("lead") || lower.includes("deal") || lower.includes("opportunity")) {
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

    // Lead creation
    const leadTitleMatch = cleanPrompt.match(/(?:create|add|new)\s+(?:a\s+)?lead(?:\s+for|\s+called|\s*:)?\s+["']?([^"',.\n]+)["']?/i);
    const leadTitle = leadTitleMatch ? leadTitleMatch[1].trim() : "Strategic Expansion Initiative";
    const createdLead = createDemoLead({
      title: leadTitle,
      companyName: `${leadTitle} Enterprises`,
      contactName: "Alex Reynolds",
      value: 95000,
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

  // Intent D: Create Task
  if (lower.includes("task") || lower.includes("remind") || lower.includes("follow up")) {
    const taskTitleMatch = cleanPrompt.match(/(?:create|add|schedule)\s+(?:a\s+)?task(?:\s+to|\s+for|\s*:)?\s+["']?([^"',.\n]+)["']?/i);
    const taskTitle = taskTitleMatch ? taskTitleMatch[1].trim() : cleanPrompt;
    const newTask = createDemoTask({
      title: taskTitle,
      priority: lower.includes("urgent") || lower.includes("high") ? "HIGH" : "MEDIUM",
      status: "PENDING",
    });

    return {
      conversationId: convId,
      answer: `Task scheduled: **${newTask.title}** (Priority: ${newTask.priority}, Due: ${newTask.dueDate}). Track progress on your CRM Tasks board.`,
      sources: ["Operational Task Scheduler"],
      toolsUsed: ["crm_create_task"],
      executionTimeMs: 120,
      executedAction: {
        type: "CREATE_TASK",
        target: newTask.title,
        result: newTask,
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
