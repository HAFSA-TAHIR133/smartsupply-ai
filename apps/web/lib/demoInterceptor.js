/**
 * Frontend-Only Demo Interceptor for SmartSupply AI.
 * Completely isolates the client session in Demo Mode:
 * - 0% backend modification.
 * - 100% mutative operations intercepted and simulated in localStorage.
 * - Zero write operations reach the real backend or production database.
 * - Read-only queries served directly from isolated baseline state.
 */

import {
  getDemoStore,
  resetDemoStore,
  getDemoCustomers,
  createDemoCustomer,
  updateDemoCustomer,
  deleteDemoCustomer,
  getDemoProducts,
  getDemoProductById,
  createDemoProduct,
  updateDemoProduct,
  deleteDemoProduct,
  adjustDemoStock,
  getDemoStockLogs,
  getDemoLeads,
  createDemoLead,
  updateDemoLead,
  deleteDemoLead,
  getDemoTasks,
  createDemoTask,
  updateDemoTask,
  deleteDemoTask,
  getDemoDashboardStats,
  getDemoCharts,
  createDemoChart,
  deleteDemoChart,
  getDemoNotifications,
  markDemoNotificationsRead,
} from "./demo/demoStore";

import { executeMockAiAgent } from "./demo/mockAiEngine";

/**
 * Checks whether the current frontend session is in Demo Mode.
 * @returns {boolean}
 */
export function isDemoSession() {
  if (typeof window === "undefined") return false;
  try {
    const isDemoFlag = localStorage.getItem("smartsupply_isDemo") === "true";
    if (isDemoFlag) return true;

    const savedUser = localStorage.getItem("smartsupply_user");
    if (savedUser && savedUser.includes("demo@smartsupply.ai")) {
      return true;
    }

    const token = localStorage.getItem("smartsupply_token");
    if (token && token.startsWith("demo-session-token")) {
      return true;
    }
  } catch (e) {
    // Ignore read errors
  }
  return false;
}

/**
 * Intercepts an API request in Demo Mode.
 * Returns the mocked/virtualized response if intercepted, or null if the request should proceed to the network.
 *
 * @param {string} endpoint - The API endpoint relative to API_BASE (e.g. "/crm/customers")
 * @param {object} options - Fetch options (method, body, headers, params)
 * @returns {Promise<any> | null}
 */
export async function interceptDemoRequest(endpoint, options = {}) {
  if (!isDemoSession()) {
    return null;
  }

  const method = (options.method || "GET").toUpperCase();
  const cleanEndpoint = endpoint.split("?")[0].replace(/\/+$/, "");

  // Small synthetic latency (15-60ms) to ensure UI feels instantaneous (<100ms)
  await new Promise((r) => setTimeout(r, 25));

  // ----------------------------------------------------
  // 1. AUTH & DEMO LIFECYCLE
  // ----------------------------------------------------

  if (cleanEndpoint === "/auth/demo" || cleanEndpoint === "/auth/login") {
    // Simulated instant demo login
    return {
      token: `demo-session-token-${Date.now()}`,
      isDemo: true,
      user: {
        id: "demo-user-1",
        email: "demo@smartsupply.ai",
        name: "Alex Reynolds",
        fullName: "Alex Reynolds",
        role: "ADMIN",
        tenantId: "demo-tenant-id",
        tenantName: "SmartSupply Demo Account",
      },
    };
  }

  if (cleanEndpoint === "/demo/reset") {
    resetDemoStore();
    return {
      success: true,
      message: "Demo database reset to baseline.",
    };
  }

  if (cleanEndpoint === "/auth/logout") {
    return { success: true };
  }

  if (cleanEndpoint === "/auth/profile" && method === "PUT") {
    const body = options.body || {};
    return { success: true, user: body };
  }

  // ----------------------------------------------------
  // 2. DASHBOARD
  // ----------------------------------------------------

  if (cleanEndpoint === "/dashboard/stats") {
    return getDemoDashboardStats();
  }

  // ----------------------------------------------------
  // 3. INVENTORY & STOCK (Reads and Writes)
  // ----------------------------------------------------

  // Adjust stock: /inventory/:id/stock (POST)
  const adjustStockMatch = cleanEndpoint.match(/^\/inventory\/([^/]+)\/stock$/);
  if (adjustStockMatch && method === "POST") {
    const productId = adjustStockMatch[1];
    const payload = options.body || {};
    return adjustDemoStock(productId, payload);
  }

  // Product history: /inventory/:id/history (GET)
  const productHistoryMatch = cleanEndpoint.match(/^\/inventory\/([^/]+)\/history$/);
  if (productHistoryMatch && method === "GET") {
    const productId = productHistoryMatch[1];
    return getDemoStockLogs(productId);
  }

  // Single product: /inventory/:id (GET, PUT, DELETE)
  const singleProductMatch = cleanEndpoint.match(/^\/inventory\/([^/]+)$/);
  if (singleProductMatch) {
    const productId = singleProductMatch[1];
    if (method === "GET") {
      const prod = getDemoProductById(productId);
      if (!prod) {
        const err = new Error(`Product '${productId}' not found`);
        err.status = 404;
        throw err;
      }
      return prod;
    }
    if (method === "PUT") {
      return updateDemoProduct(productId, options.body || {});
    }
    if (method === "DELETE") {
      return deleteDemoProduct(productId);
    }
  }

  // Product collection: /inventory (GET, POST)
  if (cleanEndpoint === "/inventory") {
    if (method === "GET") {
      return getDemoProducts();
    }
    if (method === "POST") {
      return createDemoProduct(options.body || {});
    }
  }

  // ----------------------------------------------------
  // 4. CRM - CUSTOMERS (Reads and Writes)
  // ----------------------------------------------------

  // Customer status update: /crm/customers/:id/status (PUT)
  const customerStatusMatch = cleanEndpoint.match(/^\/crm\/customers\/([^/]+)\/status$/);
  if (customerStatusMatch && method === "PUT") {
    const custId = customerStatusMatch[1];
    const { status } = options.body || {};
    return updateDemoCustomer(custId, { status });
  }

  // Single customer: /crm/customers/:id (PUT, DELETE)
  const singleCustomerMatch = cleanEndpoint.match(/^\/crm\/customers\/([^/]+)$/);
  if (singleCustomerMatch) {
    const custId = singleCustomerMatch[1];
    if (method === "PUT") {
      return updateDemoCustomer(custId, options.body || {});
    }
    if (method === "DELETE") {
      return deleteDemoCustomer(custId);
    }
  }

  // Customer collection: /crm/customers (GET, POST)
  if (cleanEndpoint === "/crm/customers") {
    if (method === "GET") {
      return getDemoCustomers();
    }
    if (method === "POST") {
      return createDemoCustomer(options.body || {});
    }
  }

  // ----------------------------------------------------
  // 5. CRM - LEADS (Reads and Writes)
  // ----------------------------------------------------

  // Lead stage update: /crm/leads/:id/stage (PUT)
  const leadStageMatch = cleanEndpoint.match(/^\/crm\/leads\/([^/]+)\/stage$/);
  if (leadStageMatch && method === "PUT") {
    const leadId = leadStageMatch[1];
    const { stage } = options.body || {};
    return updateDemoLead(leadId, { stage });
  }

  // Single lead: /crm/leads/:id (PUT, DELETE)
  const singleLeadMatch = cleanEndpoint.match(/^\/crm\/leads\/([^/]+)$/);
  if (singleLeadMatch) {
    const leadId = singleLeadMatch[1];
    if (method === "PUT") {
      return updateDemoLead(leadId, options.body || {});
    }
    if (method === "DELETE") {
      return deleteDemoLead(leadId);
    }
  }

  // Lead collection: /crm/leads (GET, POST)
  if (cleanEndpoint === "/crm/leads") {
    if (method === "GET") {
      return getDemoLeads();
    }
    if (method === "POST") {
      return createDemoLead(options.body || {});
    }
  }

  // ----------------------------------------------------
  // 6. CRM - TASKS (Reads and Writes)
  // ----------------------------------------------------

  // Single task: /crm/tasks/:id (PUT, DELETE)
  const singleTaskMatch = cleanEndpoint.match(/^\/crm\/tasks\/([^/]+)$/);
  if (singleTaskMatch) {
    const taskId = singleTaskMatch[1];
    if (method === "PUT") {
      return updateDemoTask(taskId, options.body || {});
    }
    if (method === "DELETE") {
      return deleteDemoTask(taskId);
    }
  }

  // Task collection: /crm/tasks (GET, POST)
  if (cleanEndpoint === "/crm/tasks") {
    if (method === "GET") {
      return getDemoTasks();
    }
    if (method === "POST") {
      return createDemoTask(options.body || {});
    }
  }

  // ----------------------------------------------------
  // 7. CHARTS & NOTIFICATIONS (Reads and Writes)
  // ----------------------------------------------------

  const singleChartMatch = cleanEndpoint.match(/^\/charts\/([^/]+)$/);
  if (singleChartMatch && method === "DELETE") {
    const chartId = singleChartMatch[1];
    return deleteDemoChart(chartId);
  }

  if (cleanEndpoint === "/charts") {
    if (method === "GET") {
      return getDemoCharts();
    }
    if (method === "POST") {
      return createDemoChart(options.body || {});
    }
  }

  if (cleanEndpoint === "/notifications") {
    return getDemoNotifications();
  }

  if (cleanEndpoint === "/notifications/read-all") {
    return markDemoNotificationsRead();
  }

  // ----------------------------------------------------
  // 8. AI AGENTS & CHAT (Mock AI Engine + Guardrails + Rate Limiting)
  // ----------------------------------------------------

  const agentChatMatch = cleanEndpoint.match(/^\/agents\/([^/]+)\/chat$/);
  if (agentChatMatch && method === "POST") {
    const agentId = agentChatMatch[1];
    const { message, conversationId } = options.body || {};
    return executeMockAiAgent(agentId, message, conversationId);
  }

  // Approve / reject actions locally
  const actionApproveMatch = cleanEndpoint.match(/^\/agents\/actions\/([^/]+)\/approve$/);
  if (actionApproveMatch && method === "POST") {
    const actionId = actionApproveMatch[1];
    return {
      success: true,
      actionId,
      status: "APPROVED",
      message: "Simulated action approved and applied to local sandbox.",
    };
  }

  const actionRejectMatch = cleanEndpoint.match(/^\/agents\/actions\/([^/]+)\/reject$/);
  if (actionRejectMatch && method === "POST") {
    const actionId = actionRejectMatch[1];
    return {
      success: true,
      actionId,
      status: "REJECTED",
      message: "Simulated action rejected.",
    };
  }

  // Conversations
  if (cleanEndpoint === "/conversations") {
    const store = getDemoStore();
    return store.conversations || [];
  }

  const convMessagesMatch = cleanEndpoint.match(/^\/conversations\/([^/]+)\/messages$/);
  if (convMessagesMatch && method === "GET") {
    const convId = convMessagesMatch[1];
    const store = getDemoStore();
    const conv = (store.conversations || []).find((c) => c.id === convId);
    return { messages: conv?.messages || [] };
  }

  // Not handled explicitly: return empty object / array safely
  return {};
}
