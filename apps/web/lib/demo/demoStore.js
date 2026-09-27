/**
 * Client-Side Local State Manager for SmartSupply Demo Mode.
 * Fully virtualizes database state in the browser (localStorage) to guarantee
 * zero-backend exposure, immediate UI responsiveness, and complete isolation.
 */

import { DEMO_BASELINE_DATA } from "./demoBaseline";

const STORAGE_KEY = "smartsupply_demo_db_v1";
const AI_COUNT_KEY = "smartsupply_demo_ai_count_v1";
export const DEMO_MAX_AI_ACTIONS = 10;

// Deep clone helper
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

/**
 * Initializes or loads the isolated demo state from localStorage.
 * If no state exists, seeds it with DEMO_BASELINE_DATA.
 */
export function getDemoStore() {
  if (typeof window === "undefined") {
    return deepClone(DEMO_BASELINE_DATA);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = deepClone(DEMO_BASELINE_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load demo store from localStorage, using baseline fallback:", e);
    return deepClone(DEMO_BASELINE_DATA);
  }
}

/**
 * Persists the updated state to localStorage and fires a custom event
 * so all active components across the app update immediately.
 */
export function saveDemoStore(state) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent("smartsupply:data-updated", {
        detail: { timestamp: Date.now(), source: "demoStore" },
      })
    );
  } catch (e) {
    console.error("Failed to persist demo store to localStorage:", e);
  }
}

/**
 * Resets the demo state back to pristine baseline.
 */
export function resetDemoStore() {
  if (typeof window === "undefined") return deepClone(DEMO_BASELINE_DATA);
  const baseline = deepClone(DEMO_BASELINE_DATA);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(baseline));
  localStorage.setItem(AI_COUNT_KEY, "0");
  window.dispatchEvent(
    new CustomEvent("smartsupply:data-updated", {
      detail: { timestamp: Date.now(), source: "demoReset" },
    })
  );
  return baseline;
}

// ----------------------------------------------------
// AI ACTION RATE LIMITING
// ----------------------------------------------------

export function getAiCommandCount() {
  if (typeof window === "undefined") return 0;
  const count = localStorage.getItem(AI_COUNT_KEY);
  return count ? parseInt(count, 10) || 0 : 0;
}

export function incrementAiCommandCount() {
  if (typeof window === "undefined") return 1;
  const current = getAiCommandCount();
  const next = current + 1;
  localStorage.setItem(AI_COUNT_KEY, next.toString());
  return next;
}

export function isAiRateLimitExceeded() {
  return getAiCommandCount() >= DEMO_MAX_AI_ACTIONS;
}

// ----------------------------------------------------
// CUSTOMERS OPERATIONS
// ----------------------------------------------------

export function getDemoCustomers() {
  const store = getDemoStore();
  return store.customers || [];
}

export function createDemoCustomer(payload) {
  const store = getDemoStore();
  const id = `cust-demo-${Date.now()}`;
  const newCustomer = {
    id,
    accountNo: payload.accountNo || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId: "demo-tenant-id",
    name: payload.name || "New Demo Customer",
    email: payload.email || "demo@example.com",
    phone: payload.phone || "+1 (555) 000-0000",
    company: payload.company || payload.name || "Demo Corp",
    industry: payload.industry || "General Industry",
    totalSpend: Number(payload.totalSpend || 0),
    status: payload.status || "ACTIVE",
    createdAt: new Date().toISOString(),
    ...payload,
  };

  store.customers = [newCustomer, ...(store.customers || [])];
  saveDemoStore(store);
  return newCustomer;
}

export function updateDemoCustomer(id, patch) {
  const store = getDemoStore();
  let updated = null;
  store.customers = (store.customers || []).map((c) => {
    if (c.id === id) {
      updated = { ...c, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }
    return c;
  });
  saveDemoStore(store);
  return updated;
}

export function deleteDemoCustomer(id) {
  const store = getDemoStore();
  store.customers = (store.customers || []).filter((c) => c.id !== id);
  saveDemoStore(store);
  return { success: true, id };
}

// ----------------------------------------------------
// INVENTORY & STOCK OPERATIONS
// ----------------------------------------------------

export function getDemoProducts() {
  const store = getDemoStore();
  return store.products || [];
}

export function getDemoProductById(id) {
  const store = getDemoStore();
  return (store.products || []).find((p) => p.id === id || p.sku === id) || null;
}

export function createDemoProduct(payload) {
  const store = getDemoStore();
  const id = `prod-demo-${Date.now()}`;
  const qty = Number(payload.quantity ?? payload.current_stock ?? 0);
  const price = Number(payload.unitPrice ?? payload.unit_price ?? 0);
  const reorder = Number(payload.reorderPoint ?? payload.min_stock_threshold ?? 10);

  const newProduct = {
    id,
    tenantId: "demo-tenant-id",
    name: payload.name || "New Product",
    sku: payload.sku || `SKU-${Date.now().toString().slice(-6)}`,
    category: payload.category || "General",
    unitPrice: price,
    unit_price: price,
    quantity: qty,
    current_stock: qty,
    reorderPoint: reorder,
    min_stock_threshold: reorder,
    description: payload.description || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.products = [newProduct, ...(store.products || [])];
  saveDemoStore(store);
  return newProduct;
}

export function updateDemoProduct(id, patch) {
  const store = getDemoStore();
  let updated = null;
  store.products = (store.products || []).map((p) => {
    if (p.id === id || p.sku === id) {
      const qty = patch.quantity !== undefined ? patch.quantity : (patch.current_stock !== undefined ? patch.current_stock : p.quantity);
      const price = patch.unitPrice !== undefined ? patch.unitPrice : (patch.unit_price !== undefined ? patch.unit_price : p.unitPrice);
      const reorder = patch.reorderPoint !== undefined ? patch.reorderPoint : (patch.min_stock_threshold !== undefined ? patch.min_stock_threshold : p.reorderPoint);

      updated = {
        ...p,
        ...patch,
        quantity: qty,
        current_stock: qty,
        unitPrice: price,
        unit_price: price,
        reorderPoint: reorder,
        min_stock_threshold: reorder,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }
    return p;
  });
  saveDemoStore(store);
  return updated;
}

export function adjustDemoStock(id, payload) {
  const store = getDemoStore();
  const product = (store.products || []).find((p) => p.id === id || p.sku === id);
  if (!product) {
    throw new Error(`Product '${id}' not found in demo database.`);
  }

  const changeType = payload.changeType || payload.type || "IN";
  const delta = Math.abs(Number(payload.quantity || payload.quantityDelta || 0));
  const previousQuantity = product.quantity ?? product.current_stock ?? 0;
  let newQuantity = previousQuantity;

  if (changeType === "IN") {
    newQuantity = previousQuantity + delta;
  } else if (changeType === "OUT") {
    newQuantity = Math.max(0, previousQuantity - delta);
  } else {
    // Exact adjustment
    newQuantity = Math.max(0, delta);
  }

  // Update product
  product.quantity = newQuantity;
  product.current_stock = newQuantity;
  product.updatedAt = new Date().toISOString();

  // Create audit log
  const newLog = {
    id: `log-demo-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    changeType,
    quantityDelta: changeType === "OUT" ? -delta : delta,
    previousQuantity,
    newQuantity,
    reason: payload.reason || "Demo user stock adjustment",
    executedBy: "Alex Reynolds (Demo)",
    createdAt: new Date().toISOString(),
  };

  store.stockLogs = [newLog, ...(store.stockLogs || [])];
  saveDemoStore(store);

  return {
    product,
    log: newLog,
    previousQuantity,
    newQuantity,
    changeType,
  };
}

export function getDemoStockLogs(productId) {
  const store = getDemoStore();
  const logs = store.stockLogs || [];
  if (productId) {
    return logs.filter((l) => l.productId === productId);
  }
  return logs;
}

export function deleteDemoProduct(id) {
  const store = getDemoStore();
  store.products = (store.products || []).filter((p) => p.id !== id && p.sku !== id);
  saveDemoStore(store);
  return { success: true, id };
}

// ----------------------------------------------------
// LEADS OPERATIONS
// ----------------------------------------------------

export function getDemoLeads() {
  const store = getDemoStore();
  return store.leads || [];
}

export function createDemoLead(payload) {
  const store = getDemoStore();
  const id = `lead-demo-${Date.now()}`;
  const newLead = {
    id,
    tenantId: "demo-tenant-id",
    title: payload.title || payload.name || "New Business Opportunity",
    name: payload.name || payload.title || "New Business Opportunity",
    companyName: payload.companyName || payload.company_name || "Enterprise Partner",
    contactName: payload.contactName || payload.contact_name || "Jane Doe",
    contactEmail: payload.contactEmail || payload.contact_email || "jane@example.com",
    contactPhone: payload.contactPhone || payload.contact_phone || "+1 (555) 123-4567",
    value: Number(payload.value || 50000),
    stage: payload.stage || "New",
    priority: payload.priority || "HIGH",
    notes: payload.notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.leads = [newLead, ...(store.leads || [])];
  saveDemoStore(store);
  return newLead;
}

export function updateDemoLead(id, patch) {
  const store = getDemoStore();
  let updated = null;
  store.leads = (store.leads || []).map((l) => {
    if (l.id === id) {
      updated = {
        ...l,
        ...patch,
        title: patch.title || patch.name || l.title,
        companyName: patch.companyName || patch.company_name || l.companyName,
        contactName: patch.contactName || patch.contact_name || l.contactName,
        contactEmail: patch.contactEmail || patch.contact_email || l.contactEmail,
        contactPhone: patch.contactPhone || patch.contact_phone || l.contactPhone,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }
    return l;
  });
  saveDemoStore(store);
  return updated;
}

export function deleteDemoLead(id) {
  const store = getDemoStore();
  store.leads = (store.leads || []).filter((l) => l.id !== id);
  saveDemoStore(store);
  return { success: true, id };
}

// ----------------------------------------------------
// TASKS OPERATIONS
// ----------------------------------------------------

export function getDemoTasks() {
  const store = getDemoStore();
  return store.tasks || [];
}

export function createDemoTask(payload) {
  const store = getDemoStore();
  const id = `task-demo-${Date.now()}`;
  const newTask = {
    id,
    tenantId: "demo-tenant-id",
    title: payload.title || "Demo Task",
    dueDate: payload.dueDate || payload.due_date || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    priority: payload.priority || "MEDIUM",
    status: payload.status || "PENDING",
    createdAt: new Date().toISOString(),
  };

  store.tasks = [newTask, ...(store.tasks || [])];
  saveDemoStore(store);
  return newTask;
}

export function updateDemoTask(id, patch) {
  const store = getDemoStore();
  let updated = null;
  store.tasks = (store.tasks || []).map((t) => {
    if (t.id === id) {
      updated = {
        ...t,
        ...patch,
        dueDate: patch.dueDate || patch.due_date || t.dueDate,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }
    return t;
  });
  saveDemoStore(store);
  return updated;
}

export function deleteDemoTask(id) {
  const store = getDemoStore();
  store.tasks = (store.tasks || []).filter((t) => t.id !== id);
  saveDemoStore(store);
  return { success: true, id };
}

// ----------------------------------------------------
// DASHBOARD STATS CALCULATION (Real-Time from Local Store)
// ----------------------------------------------------

export function getDemoDashboardStats() {
  const store = getDemoStore();
  const products = store.products || [];
  const leads = store.leads || [];
  const tasks = store.tasks || [];

  const totalStock = products.reduce((acc, p) => acc + (p.quantity ?? p.current_stock ?? 0), 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + (p.quantity ?? p.current_stock ?? 0) * (p.unitPrice ?? p.unit_price ?? 0),
    0
  );
  const criticalItems = products.filter(
    (p) => (p.quantity ?? p.current_stock ?? 0) <= (p.reorderPoint ?? p.min_stock_threshold ?? 10)
  );

  const pipelineValue = leads.reduce((acc, l) => acc + Number(l.value || 0), 0);

  const stageCounts = {};
  leads.forEach((l) => {
    const s = l.stage || "New";
    if (!stageCounts[s]) stageCounts[s] = { count: 0, amount: 0 };
    stageCounts[s].count += 1;
    stageCounts[s].amount += Number(l.value || 0);
  });

  const stageDistribution = ["New", "Contacted", "Qualified", "Proposal", "Won"].map((st) => ({
    name: st,
    value: stageCounts[st]?.count || 0,
    amount: stageCounts[st]?.amount || 0,
  }));

  const urgentTasks = tasks.filter((t) => t.status !== "COMPLETED").slice(0, 3);

  return {
    inventory: {
      totalProducts: products.length,
      totalStock,
      totalValuation: Math.round(totalValuation),
      lowStockCount: criticalItems.length,
      criticalItems,
    },
    crm: {
      totalLeads: leads.length,
      pipelineValue: Math.round(pipelineValue),
      stageDistribution,
      urgentTasks,
    },
    agents: {
      activeAgentsCount: 4,
      totalExecutions: 86 + getAiCommandCount(),
      successRate: "99.8%",
    },
    trendData: [
      { month: "Apr", valuation: 120000, stock: 710 },
      { month: "May", valuation: 135000, stock: 760 },
      { month: "Jun", valuation: 128000, stock: 730 },
      { month: "Jul", valuation: 148000, stock: 810 },
      { month: "Aug", valuation: 154000, stock: 840 },
      { month: "Sep", valuation: Math.round(totalValuation) || 164000, stock: totalStock || 820 },
    ],
  };
}

// ----------------------------------------------------
// CHARTS & NOTIFICATIONS
// ----------------------------------------------------

export function getDemoCharts() {
  const store = getDemoStore();
  return store.charts || [];
}

export function createDemoChart(payload) {
  const store = getDemoStore();
  const id = `chart-demo-${Date.now()}`;
  const newChart = {
    id,
    tenantId: "demo-tenant-id",
    title: payload.title || "Custom Analytics",
    chartType: payload.chartType || "bar",
    metric: payload.metric || "custom",
    timeframe: payload.timeframe || "CURRENT",
    data: payload.data || [
      { name: "Segment A", value: 400 },
      { name: "Segment B", value: 300 },
      { name: "Segment C", value: 200 },
    ],
    createdAt: new Date().toISOString(),
  };

  store.charts = [newChart, ...(store.charts || [])];
  saveDemoStore(store);
  return newChart;
}

export function deleteDemoChart(id) {
  const store = getDemoStore();
  store.charts = (store.charts || []).filter((c) => c.id !== id);
  saveDemoStore(store);
  return { success: true, id };
}

export function getDemoNotifications() {
  const store = getDemoStore();
  return store.notifications || [];
}

export function markDemoNotificationsRead() {
  const store = getDemoStore();
  store.notifications = (store.notifications || []).map((n) => ({ ...n, isRead: true }));
  saveDemoStore(store);
  return { success: true };
}
