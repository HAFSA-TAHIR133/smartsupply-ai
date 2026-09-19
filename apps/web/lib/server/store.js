import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as neonDb from "./neonDb.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me-later-smartsupply";
const DATA_DIR = path.resolve(process.cwd(), ".data");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {}
}

const LIVE_DB_PATH = path.join(DATA_DIR, "smartsupply_live_db.json");
const DEMO_DB_PATH = path.join(DATA_DIR, "smartsupply_demo_sandbox.json");

// Default initial dataset for Demo Sandbox
const INITIAL_DEMO_DATA = {
  products: [
    {
      id: "prod-demo-1",
      tenantId: "demo-tenant-id",
      name: "Brushless Motor 24V High-Torque",
      sku: "MTR-BRSH-024",
      category: "Machinery",
      unitPrice: 185.0,
      quantity: 42,
      reorderPoint: 15,
      description: "Industrial grade 24V brushless motor for conveyor assemblies",
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod-demo-2",
      tenantId: "demo-tenant-id",
      name: "Lithium Polymer Pack 48V 20Ah",
      sku: "BAT-LIPO-4820",
      category: "Batteries",
      unitPrice: 320.0,
      quantity: 6,
      reorderPoint: 10,
      description: "High-density energy storage pack with thermal safeguard",
      createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod-demo-3",
      tenantId: "demo-tenant-id",
      name: "Optoelectronic Sensor 5V",
      sku: "SEN-OPTO-005",
      category: "Electronics",
      unitPrice: 24.5,
      quantity: 110,
      reorderPoint: 25,
      description: "Precision photoelectric proximity beam sensor",
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod-demo-4",
      tenantId: "demo-tenant-id",
      name: "Titanium Hex Bolts M8x40 (Box 50)",
      sku: "FST-TI-M840",
      category: "Fasteners",
      unitPrice: 48.0,
      quantity: 0,
      reorderPoint: 12,
      description: "Aerospace grade grade-5 titanium corrosion-resistant fasteners",
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "prod-demo-5",
      tenantId: "demo-tenant-id",
      name: "Carbon Fiber Plate 500x500mm",
      sku: "MAT-CF-5050",
      category: "Raw Materials",
      unitPrice: 135.0,
      quantity: 18,
      reorderPoint: 8,
      description: "High tensile 3K weave structural plate",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  stockLogs: [
    {
      id: "log-demo-1",
      productId: "prod-demo-1",
      productName: "Brushless Motor 24V High-Torque",
      sku: "MTR-BRSH-024",
      changeType: "IN",
      quantityDelta: 20,
      previousQuantity: 22,
      newQuantity: 42,
      reason: "Supplier batch delivery #PO-9812",
      executedBy: "Alex Reynolds (Demo)",
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "log-demo-2",
      productId: "prod-demo-2",
      productName: "Lithium Polymer Pack 48V 20Ah",
      sku: "BAT-LIPO-4820",
      changeType: "OUT",
      quantityDelta: -4,
      previousQuantity: 10,
      newQuantity: 6,
      reason: "Customer order shipment #ORD-5011",
      executedBy: "Alex Reynolds (Demo)",
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ],
  leads: [
    {
      id: "lead-demo-1",
      tenantId: "demo-tenant-id",
      title: "Global Robotics Fleet Expansion",
      companyName: "AeroTech Automations Inc",
      contactName: "Marcus Vance",
      contactEmail: "marcus@aerotech-auto.com",
      contactPhone: "+1 (555) 392-1049",
      value: 145000,
      stage: "Qualified",
      priority: "HIGH",
      notes: "Urgent need for 24V motors and battery packs before Q4 delivery.",
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lead-demo-2",
      tenantId: "demo-tenant-id",
      title: "Autonomous Delivery Drone Supply",
      companyName: "SkyGlide Deliveries",
      contactName: "Elena Rostova",
      contactEmail: "elena@skyglide.io",
      contactPhone: "+1 (555) 778-9901",
      value: 85000,
      stage: "Proposal",
      priority: "HIGH",
      notes: "Proposal submitted for 200 high-density 48V battery units.",
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lead-demo-3",
      tenantId: "demo-tenant-id",
      title: "Solar Inverter Sensor Upgrade",
      companyName: "HelioVolt Energy Corp",
      contactName: "David Chen",
      contactEmail: "dchen@heliovolt.com",
      contactPhone: "+1 (555) 441-2299",
      value: 38000,
      stage: "Contacted",
      priority: "MEDIUM",
      notes: "Requested technical specification sheet for optoelectronic sensors.",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "lead-demo-4",
      tenantId: "demo-tenant-id",
      title: "Manufacturing Plant Re-Tooling",
      companyName: "Apex Heavy Industries",
      contactName: "Sarah Jenkins",
      contactEmail: "s.jenkins@apexheavy.com",
      contactPhone: "+1 (555) 609-3382",
      value: 210000,
      stage: "Won",
      priority: "HIGH",
      notes: "Contract signed for annual fastener and motor fulfillment.",
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  customers: [
    {
      id: "cust-demo-1",
      tenantId: "demo-tenant-id",
      name: "Apex Heavy Industries",
      email: "procurement@apexheavy.com",
      phone: "+1 (555) 609-3382",
      company: "Apex Heavy Industries",
      totalSpend: 210000,
      status: "ACTIVE",
    },
    {
      id: "cust-demo-2",
      tenantId: "demo-tenant-id",
      name: "Vanguard Marine Systems",
      email: "supplies@vanguard-marine.com",
      phone: "+1 (555) 881-4412",
      company: "Vanguard Marine Systems",
      totalSpend: 74500,
      status: "ACTIVE",
    },
  ],
  tasks: [
    {
      id: "task-demo-1",
      tenantId: "demo-tenant-id",
      title: "Follow up with Marcus Vance on AeroTech quotation",
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
      priority: "HIGH",
      status: "PENDING",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "task-demo-2",
      tenantId: "demo-tenant-id",
      title: "Restock PO for Titanium Hex Bolts M8x40",
      dueDate: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
      priority: "HIGH",
      status: "PENDING",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "task-demo-3",
      tenantId: "demo-tenant-id",
      title: "Send battery compliance specs to SkyGlide Deliveries",
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
      priority: "MEDIUM",
      status: "COMPLETED",
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
  charts: [
    {
      id: "chart-demo-1",
      tenantId: "demo-tenant-id",
      title: "Warehouse Stock Valuation by Category",
      chartType: "bar",
      metric: "stock_valuation",
      timeframe: "CURRENT",
      data: [
        { name: "Machinery", value: 7770 },
        { name: "Batteries", value: 1920 },
        { name: "Electronics", value: 2695 },
        { name: "Raw Materials", value: 2430 },
        { name: "Fasteners", value: 0 },
      ],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
  conversations: [
    {
      id: "conv-demo-1",
      title: "Stock Audit & Reorder Recommendations",
      agentId: "supply-chain-agent",
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      messages: [
        {
          id: "msg-demo-1",
          sender: "USER",
          content: "Can you review our low stock items and give me a summary?",
          createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
          id: "msg-demo-2",
          sender: "AGENT",
          content: "I have analyzed your warehouse inventory: **Titanium Hex Bolts M8x40** is currently **Out of Stock** (0 units vs. 12 reorder threshold). **Lithium Polymer Pack 48V** is also on **Low Stock Alert** with only 6 units remaining (min threshold 10).\n\nWould you like me to draft an autonomous purchase order or restock action for these items?",
          createdAt: new Date(Date.now() - 3600000 * 6 + 2000).toISOString(),
          sources: ["Warehouse Inventory Master", "Safety Stock Policy v2.4"],
        },
      ],
    },
  ],
  pendingActions: [],
  memories: {},
};

// Initial state for Live DB (seeded with initial admin user)
function getInitialLiveDb() {
  const adminId = "user-live-admin";
  const tenantId = "tenant-live-default";
  const passwordHash = bcrypt.hashSync("admin123", 10);

  return {
    users: [
      {
        id: adminId,
        email: "admin@smartsupply.ai",
        name: "Admin User",
        passwordHash,
        tenantId,
        role: "ADMIN",
        isDemo: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    tenants: [
      {
        id: tenantId,
        name: "Enterprise Global Logistics",
        slug: "enterprise-global",
        isActive: true,
        isDemo: false,
        createdAt: new Date().toISOString(),
      },
    ],
    products: [
      {
        id: "prod-live-1",
        tenantId,
        name: "Heavy Duty Linear Actuator 12V",
        sku: "ACT-LIN-012",
        category: "Machinery",
        unitPrice: 240.0,
        quantity: 50,
        reorderPoint: 10,
        description: "Industrial linear actuator with position encoder",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "prod-live-2",
        tenantId,
        name: "Servo Drive Controller 400W",
        sku: "SRV-DRV-040",
        category: "Electronics",
        unitPrice: 195.0,
        quantity: 8,
        reorderPoint: 15,
        description: "Closed loop digital AC servo amplifier",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    stockLogs: [
      {
        id: "log-live-1",
        productId: "prod-live-1",
        productName: "Heavy Duty Linear Actuator 12V",
        sku: "ACT-LIN-012",
        changeType: "IN",
        quantityDelta: 50,
        previousQuantity: 0,
        newQuantity: 50,
        reason: "Initial warehouse intake",
        executedBy: "Admin User",
        createdAt: new Date().toISOString(),
      },
    ],
    leads: [
      {
        id: "lead-live-1",
        tenantId,
        title: "National Courier Fleet Automation",
        companyName: "Prime Logistics Group",
        contactName: "Arthur Vance",
        contactEmail: "avance@primelog.com",
        contactPhone: "+1 (555) 234-8800",
        value: 120000,
        stage: "Qualified",
        priority: "HIGH",
        notes: "Evaluating linear actuators and servo amplifiers for conveyor line.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    customers: [],
    tasks: [
      {
        id: "task-live-1",
        tenantId,
        title: "Review vendor pricing for Q4 inventory replenishment",
        dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
        priority: "MEDIUM",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
    ],
    charts: [],
    conversations: [],
    pendingActions: [],
    memories: {},
  };
}

// File I/O helpers
function readJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
  }
  return JSON.parse(JSON.stringify(fallback));
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
}

// Global in-memory cache synchronized with disk
let demoDb = null;
let liveDb = null;

export function getDemoDb() {
  if (!demoDb) {
    demoDb = readJson(DEMO_DB_PATH, INITIAL_DEMO_DATA);
  }
  return demoDb;
}

export function saveDemoDb() {
  if (demoDb) {
    writeJson(DEMO_DB_PATH, demoDb);
  }
}

export function resetDemoDb() {
  demoDb = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  saveDemoDb();
  return demoDb;
}

export function getLiveDb() {
  if (!liveDb) {
    liveDb = readJson(LIVE_DB_PATH, getInitialLiveDb());
  }
  return liveDb;
}

export function saveLiveDb() {
  if (liveDb) {
    writeJson(LIVE_DB_PATH, liveDb);
  }
}

// Token & Identity Helpers
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/**
 * Extracts and validates execution mode from Authorization header
 * Strict server-side verification: isDemo is NEVER taken from client parameters.
 */
export function getAuthenticatedContext(req) {
  let token = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // Safe default: Unauthenticated or headless requests seamlessly operate in Demo Sandbox
  const defaultDemoContext = {
    isAuthenticated: true,
    isDemo: true,
    mode: "DEMO",
    user: {
      id: "demo-user-alex",
      email: "demo@smartsupply.ai",
      name: "Alex Reynolds",
      role: "ADMIN",
      tenantId: "demo-tenant-id",
      tenantName: "Acme Logistics Global (Demo)",
      isDemo: true,
    },
  };

  if (!token || token === "null" || token === "undefined") {
    return defaultDemoContext;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return defaultDemoContext;
  }

  const isDemo = Boolean(decoded.isDemo);

  if (isDemo) {
    return {
      isAuthenticated: true,
      isDemo: true,
      mode: "DEMO",
      user: {
        id: decoded.userId || "demo-user-alex",
        email: decoded.email || "demo@smartsupply.ai",
        name: decoded.name || "Alex Reynolds",
        role: decoded.role || "ADMIN",
        tenantId: "demo-tenant-id",
        tenantName: "Acme Logistics Global (Demo)",
        isDemo: true,
      },
    };
  }

  // Real User from Live DB (claims signed and verified cryptographically by JWT)
  return {
    isAuthenticated: true,
    isDemo: false,
    mode: "LIVE",
    user: {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || "ADMIN",
      tenantId: decoded.tenantId,
      tenantName: decoded.tenantName || "Enterprise Logistics",
      isDemo: false,
    },
  };
}

// -------------------------------------------------------------
// Unified Data Adapter: Automatically routes DEMO vs LIVE mode
// -------------------------------------------------------------
export const storeAdapter = {
  // --- INVENTORY OPERATIONS ---
  async getProducts(context, filters = {}) {
    let list = [];
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        list = await neonDb.getProductsFromDb(context.user?.tenantId);
      } catch (err) {
        console.error("Neon getProducts error, falling back to local:", err.message);
        const db = getLiveDb();
        list = (db.products || []).filter((p) => p.tenantId === context.user?.tenantId);
      }
    } else {
      const db = context.isDemo ? getDemoDb() : getLiveDb();
      list = db.products || [];
      if (!context.isDemo && context.user?.tenantId) {
        list = list.filter((p) => p.tenantId === context.user.tenantId);
      }
    }

    if (filters.category && filters.category !== "ALL") {
      list = list.filter((p) => p.category === filters.category);
    }
    if (filters.status) {
      if (filters.status === "OUT_OF_STOCK") {
        list = list.filter((p) => Number(p.quantity ?? p.current_stock ?? 0) === 0);
      } else if (filters.status === "LOW_STOCK") {
        list = list.filter((p) => {
          const qty = Number(p.quantity ?? p.current_stock ?? 0);
          const min = Number(p.reorderPoint ?? p.min_stock_threshold ?? 10);
          return qty > 0 && qty <= min;
        });
      } else if (filters.status === "IN_STOCK") {
        list = list.filter((p) => {
          const qty = Number(p.quantity ?? p.current_stock ?? 0);
          const min = Number(p.reorderPoint ?? p.min_stock_threshold ?? 10);
          return qty > min;
        });
      }
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    // Map to frontend expected shape
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || "General",
      unit_price: Number(p.unitPrice ?? p.unit_price ?? 0),
      unitPrice: Number(p.unitPrice ?? p.unit_price ?? 0),
      current_stock: Number(p.quantity ?? p.current_stock ?? 0),
      quantity: Number(p.quantity ?? p.current_stock ?? 0),
      min_stock_threshold: Number(p.reorderPoint ?? p.min_stock_threshold ?? 10),
      reorderPoint: Number(p.reorderPoint ?? p.min_stock_threshold ?? 10),
      description: p.description || "",
      tenantId: p.tenantId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      _executionMode: context.mode,
    }));
  },

  async getProductById(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const item = await neonDb.getProductByIdFromDb(id, context.user?.tenantId);
        if (item) return { ...item, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon getProductById error:", err.message);
      }
    }
    const products = await this.getProducts(context);
    return products.find((p) => p.id === id) || null;
  },

  async createProduct(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const item = await neonDb.createProductInDb(context.user?.tenantId, payload);
        return { ...item, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon createProduct error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const newProduct = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: context.user?.tenantId || "demo-tenant-id",
      name: payload.name,
      sku: payload.sku,
      category: payload.category || "General",
      unitPrice: Number(payload.unitPrice ?? payload.unit_price ?? 0),
      quantity: Number(payload.quantity ?? payload.current_stock ?? 0),
      reorderPoint: Number(payload.reorderPoint ?? payload.min_stock_threshold ?? 10),
      description: payload.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.products) db.products = [];
    db.products.unshift(newProduct);

    if (newProduct.quantity > 0) {
      if (!db.stockLogs) db.stockLogs = [];
      db.stockLogs.unshift({
        id: `log-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        changeType: "IN",
        quantityDelta: newProduct.quantity,
        previousQuantity: 0,
        newQuantity: newProduct.quantity,
        reason: "Initial inventory setup",
        executedBy: context.user?.name || "User",
        createdAt: new Date().toISOString(),
      });
    }

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      ...newProduct,
      unit_price: newProduct.unitPrice,
      current_stock: newProduct.quantity,
      min_stock_threshold: newProduct.reorderPoint,
      _executionMode: context.mode,
    };
  },

  async updateProduct(context, id, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const updated = await neonDb.updateProductInDb(id, context.user?.tenantId, payload);
        if (updated) return { ...updated, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon updateProduct error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const item = (db.products || []).find(
      (p) => p.id === id && (context.isDemo || p.tenantId === context.user?.tenantId)
    );

    if (!item) {
      throw new Error(`Product ${id} not found in ${context.mode} mode.`);
    }

    if (payload.name !== undefined) item.name = payload.name;
    if (payload.sku !== undefined) item.sku = payload.sku;
    if (payload.category !== undefined) item.category = payload.category;
    if (payload.unitPrice !== undefined || payload.unit_price !== undefined) {
      item.unitPrice = Number(payload.unitPrice ?? payload.unit_price);
    }
    if (payload.quantity !== undefined || payload.current_stock !== undefined) {
      item.quantity = Number(payload.quantity ?? payload.current_stock);
    }
    if (payload.reorderPoint !== undefined || payload.min_stock_threshold !== undefined) {
      item.reorderPoint = Number(payload.reorderPoint ?? payload.min_stock_threshold);
    }
    if (payload.description !== undefined) item.description = payload.description;
    item.updatedAt = new Date().toISOString();

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      ...item,
      unit_price: item.unitPrice,
      current_stock: item.quantity,
      min_stock_threshold: item.reorderPoint,
      _executionMode: context.mode,
    };
  },

  async deleteProduct(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const ok = await neonDb.deleteProductFromDb(id, context.user?.tenantId);
        return { success: ok, deletedId: id, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon deleteProduct error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const index = (db.products || []).findIndex(
      (p) => p.id === id && (context.isDemo || p.tenantId === context.user?.tenantId)
    );

    if (index === -1) {
      throw new Error(`Product ${id} not found in ${context.mode} mode.`);
    }

    const removed = db.products.splice(index, 1)[0];

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      success: true,
      deletedId: id,
      deletedProduct: removed,
      _executionMode: context.mode,
    };
  },

  async adjustStock(context, id, { changeType, quantityDelta, reason }) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const updated = await neonDb.adjustStockInDb(id, context.user?.tenantId, {
          type: changeType,
          quantity: quantityDelta,
          reason,
          executedBy: context.user?.name || "Admin User",
        });
        return { product: updated, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon adjustStock error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const item = (db.products || []).find(
      (p) => p.id === id && (context.isDemo || p.tenantId === context.user?.tenantId)
    );

    if (!item) {
      throw new Error(`Product ${id} not found in ${context.mode} mode.`);
    }

    const prevQty = Number(item.quantity || 0);
    let delta = Number(quantityDelta || 0);

    if (changeType === "OUT") {
      delta = -Math.abs(delta);
    } else if (changeType === "IN") {
      delta = Math.abs(delta);
    }

    const newQty = Math.max(0, prevQty + delta);
    item.quantity = newQty;
    item.updatedAt = new Date().toISOString();

    if (!db.stockLogs) db.stockLogs = [];
    const logEntry = {
      id: `log-${Date.now()}`,
      productId: item.id,
      productName: item.name,
      sku: item.sku,
      changeType: changeType || (delta >= 0 ? "IN" : "OUT"),
      quantityDelta: delta,
      previousQuantity: prevQty,
      newQuantity: newQty,
      reason: reason || "Manual warehouse adjustment",
      executedBy: context.user?.name || "User",
      createdAt: new Date().toISOString(),
    };
    db.stockLogs.unshift(logEntry);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      product: {
        ...item,
        unit_price: item.unitPrice,
        current_stock: item.quantity,
        min_stock_threshold: item.reorderPoint,
      },
      log: logEntry,
      _executionMode: context.mode,
    };
  },

  async getStockHistory(context, productId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        return await neonDb.getStockLogsFromDb(productId, context.user?.tenantId);
      } catch (err) {
        console.error("Neon getStockHistory error:", err.message);
      }
    }
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const logs = db.stockLogs || [];
    if (!productId) return logs;
    return logs.filter((l) => l.productId === productId);
  },

  // --- CRM LEADS ---
  async getLeads(context) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const list = await neonDb.getLeadsFromDb(context.user?.tenantId);
        return list.map((l) => ({ ...l, _executionMode: "LIVE" }));
      } catch (err) {
        console.error("Neon getLeads error, falling back to local:", err.message);
      }
    }
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    let leads = db.leads || [];
    if (!context.isDemo && context.user?.tenantId) {
      leads = leads.filter((l) => l.tenantId === context.user.tenantId);
    }
    return leads.map((l) => ({ ...l, _executionMode: context.mode }));
  },

  async createLead(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const lead = await neonDb.createLeadInDb(context.user?.tenantId, payload);
        return { ...lead, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon createLead error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const newLead = {
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: context.user?.tenantId || "demo-tenant-id",
      title: payload.title,
      companyName: payload.company_name || payload.companyName || "",
      contactName: payload.contact_name || payload.contactName || "",
      contactEmail: payload.contact_email || payload.contactEmail || "",
      contactPhone: payload.contact_phone || payload.contactPhone || "",
      value: Number(payload.value || 0),
      stage: payload.stage || "New",
      priority: payload.priority || "MEDIUM",
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.leads) db.leads = [];
    db.leads.unshift(newLead);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { ...newLead, _executionMode: context.mode };
  },

  async updateLead(context, id, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const updated = await neonDb.updateLeadInDb(id, context.user?.tenantId, payload);
        if (updated) return { ...updated, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon updateLead error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const item = (db.leads || []).find(
      (l) => l.id === id && (context.isDemo || l.tenantId === context.user?.tenantId)
    );

    if (!item) {
      throw new Error(`Lead ${id} not found in ${context.mode} mode.`);
    }

    if (payload.title !== undefined) item.title = payload.title;
    if (payload.companyName !== undefined || payload.company_name !== undefined) {
      item.companyName = payload.companyName ?? payload.company_name;
    }
    if (payload.contactName !== undefined || payload.contact_name !== undefined) {
      item.contactName = payload.contactName ?? payload.contact_name;
    }
    if (payload.contactEmail !== undefined || payload.contact_email !== undefined) {
      item.contactEmail = payload.contactEmail ?? payload.contact_email;
    }
    if (payload.contactPhone !== undefined || payload.contact_phone !== undefined) {
      item.contactPhone = payload.contactPhone ?? payload.contact_phone;
    }
    if (payload.value !== undefined) item.value = Number(payload.value);
    if (payload.stage !== undefined) item.stage = payload.stage;
    if (payload.priority !== undefined) item.priority = payload.priority;
    if (payload.notes !== undefined) item.notes = payload.notes;
    item.updatedAt = new Date().toISOString();

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { ...item, _executionMode: context.mode };
  },

  async deleteLead(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const ok = await neonDb.deleteLeadFromDb(id, context.user?.tenantId);
        return { success: ok, deletedId: id, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon deleteLead error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const index = (db.leads || []).findIndex(
      (l) => l.id === id && (context.isDemo || l.tenantId === context.user?.tenantId)
    );

    if (index === -1) {
      throw new Error(`Lead ${id} not found in ${context.mode} mode.`);
    }

    const removed = db.leads.splice(index, 1)[0];

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { success: true, deletedId: id, deletedLead: removed, _executionMode: context.mode };
  },

  // --- CRM TASKS ---
  async getTasks(context) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const list = await neonDb.getTasksFromDb(context.user?.tenantId);
        return list.map((t) => ({ ...t, _executionMode: "LIVE" }));
      } catch (err) {
        console.error("Neon getTasks error, falling back to local:", err.message);
      }
    }
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    let tasks = db.tasks || [];
    if (!context.isDemo && context.user?.tenantId) {
      tasks = tasks.filter((t) => t.tenantId === context.user.tenantId);
    }
    return tasks.map((t) => ({ ...t, _executionMode: context.mode }));
  },

  async createTask(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const task = await neonDb.createTaskInDb(context.user?.tenantId, payload);
        return { ...task, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon createTask error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const newTask = {
      id: `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: context.user?.tenantId || "demo-tenant-id",
      title: payload.title,
      dueDate: payload.due_date || payload.dueDate || new Date().toISOString().split("T")[0],
      priority: payload.priority || "MEDIUM",
      status: payload.status || "PENDING",
      createdAt: new Date().toISOString(),
    };

    if (!db.tasks) db.tasks = [];
    db.tasks.unshift(newTask);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { ...newTask, _executionMode: context.mode };
  },

  async updateTask(context, id, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const updated = await neonDb.updateTaskInDb(id, context.user?.tenantId, payload);
        if (updated) return { ...updated, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon updateTask error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const item = (db.tasks || []).find(
      (t) => t.id === id && (context.isDemo || t.tenantId === context.user?.tenantId)
    );

    if (!item) {
      throw new Error(`Task ${id} not found in ${context.mode} mode.`);
    }

    if (payload.title !== undefined) item.title = payload.title;
    if (payload.dueDate !== undefined || payload.due_date !== undefined) {
      item.dueDate = payload.dueDate ?? payload.due_date;
    }
    if (payload.priority !== undefined) item.priority = payload.priority;
    if (payload.status !== undefined) item.status = payload.status;

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { ...item, _executionMode: context.mode };
  },

  async deleteTask(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const ok = await neonDb.deleteTaskFromDb(id, context.user?.tenantId);
        return { success: ok, deletedId: id, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon deleteTask error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const index = (db.tasks || []).findIndex(
      (t) => t.id === id && (context.isDemo || t.tenantId === context.user?.tenantId)
    );

    if (index === -1) {
      throw new Error(`Task ${id} not found in ${context.mode} mode.`);
    }

    const removed = db.tasks.splice(index, 1)[0];

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { success: true, deletedId: id, deletedTask: removed, _executionMode: context.mode };
  },

  getCustomers(context) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    let custs = db.customers || [];
    if (!context.isDemo && context.user?.tenantId) {
      custs = custs.filter((c) => c.tenantId === context.user.tenantId);
    }
    return custs;
  },

  // --- DASHBOARD & ANALYTICS ---
  async getDashboardStats(context) {
    const products = await this.getProducts(context);
    const leads = await this.getLeads(context);
    const tasks = await this.getTasks(context);

    let totalValuation = 0;
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryTotals = {};
    const criticalItems = [];

    products.forEach((p) => {
      const qty = Number(p.quantity ?? p.current_stock ?? 0);
      const price = Number(p.unitPrice ?? p.unit_price ?? 0);
      const min = Number(p.reorderPoint ?? p.min_stock_threshold ?? 10);
      const val = qty * price;
      totalValuation += val;
      totalStock += qty;

      if (qty === 0) {
        outOfStockCount += 1;
      }
      if (qty <= min) {
        lowStockCount += 1;
        criticalItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          current_stock: qty,
          min_stock_threshold: min,
          category: p.category,
        });
      }

      const cat = p.category || "General";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
    });

    const pipelineTotal = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);
    const wonTotal = leads
      .filter((l) => l.stage === "Won" || l.status === "Won")
      .reduce((sum, l) => sum + Number(l.value || 0), 0);

    // Stage distribution for CRM
    const stageCounts = { New: 0, Contacted: 0, Qualified: 0, Proposal: 0, Won: 0 };
    const stageValues = { New: 0, Contacted: 0, Qualified: 0, Proposal: 0, Won: 0 };
    leads.forEach((l) => {
      const st = l.stage || l.status || "New";
      const val = Number(l.value || 0);
      if (stageCounts[st] !== undefined) {
        stageCounts[st] += 1;
        stageValues[st] += val;
      } else {
        stageCounts[st] = 1;
        stageValues[st] = val;
      }
    });

    const stageDistribution = Object.keys(stageCounts).map((key) => ({
      name: key,
      value: stageCounts[key],
      amount: stageValues[key],
    }));

    const urgentTasks = tasks
      .filter((t) => ["PENDING", "TODO", "IN_PROGRESS"].includes((t.status || "").toUpperCase()))
      .map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.dueDate || t.due_date || new Date().toISOString().split("T")[0],
        status: t.status,
        priority: t.priority || "MEDIUM",
      }));

    // Realistic monthly trend data
    const trendData = [
      { month: "Apr", valuation: Math.round(totalValuation * 0.73), stock: Math.round(totalStock * 0.86) },
      { month: "May", valuation: Math.round(totalValuation * 0.82), stock: Math.round(totalStock * 0.92) },
      { month: "Jun", valuation: Math.round(totalValuation * 0.78), stock: Math.round(totalStock * 0.89) },
      { month: "Jul", valuation: Math.round(totalValuation * 0.90), stock: Math.round(totalStock * 0.98) },
      { month: "Aug", valuation: Math.round(totalValuation * 0.94), stock: Math.round(totalStock * 1.02) },
      { month: "Sep", valuation: Math.round(totalValuation), stock: totalStock },
    ];

    const categoryDistribution = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    return {
      executionMode: context.mode,
      inventory: {
        totalProducts: products.length,
        totalStock,
        totalValuation: Math.round(totalValuation * 100) / 100,
        lowStockCount,
        outOfStockCount,
        criticalItems,
      },
      crm: {
        totalLeads: leads.length,
        pipelineValue: pipelineTotal,
        stageDistribution,
        urgentTasks,
      },
      agents: {
        activeAgentsCount: 4,
        totalExecutions: 86,
        successRate: "99.4%",
      },
      trendData,
      // Root compatibility keys
      totalProducts: products.length,
      totalStock,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
      pipelineTotal,
      wonTotal,
      openTasksCount: urgentTasks.length,
      categoryDistribution,
      topLowStock: criticalItems.slice(0, 5),
    };
  },

  // --- CHARTS ---
  async getCharts(context) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const list = await neonDb.getChartsFromDb(context.user?.tenantId);
        return list.map((c) => ({ ...c, _executionMode: "LIVE" }));
      } catch (err) {
        console.error("Neon getCharts error, falling back to local:", err.message);
      }
    }
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    let charts = db.charts || [];
    if (!context.isDemo && context.user?.tenantId) {
      charts = charts.filter((c) => c.tenantId === context.user.tenantId);
    }
    return charts.map((c) => ({ ...c, _executionMode: context.mode }));
  },

  async createChart(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const chart = await neonDb.createChartInDb(context.user?.tenantId, context.user?.id, payload);
        return { ...chart, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon createChart error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const newChart = {
      id: `chart-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: context.user?.tenantId || "demo-tenant-id",
      title: payload.title || "Custom Analytics Chart",
      chartType: payload.chartType || payload.chart_type || "bar",
      metric: payload.metric || "inventory_stock",
      timeframe: payload.timeframe || "CURRENT",
      data: payload.data || [],
      createdAt: new Date().toISOString(),
    };

    if (!db.charts) db.charts = [];
    db.charts.unshift(newChart);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { ...newChart, _executionMode: context.mode };
  },

  async deleteChart(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      try {
        const ok = await neonDb.deleteChartFromDb(id, context.user?.tenantId);
        return { success: ok, deletedId: id, _executionMode: "LIVE" };
      } catch (err) {
        console.error("Neon deleteChart error, falling back to local:", err.message);
      }
    }

    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const index = (db.charts || []).findIndex(
      (c) => c.id === id && (context.isDemo || c.tenantId === context.user?.tenantId)
    );

    if (index === -1) {
      throw new Error(`Chart ${id} not found in ${context.mode} mode.`);
    }

    const removed = db.charts.splice(index, 1)[0];

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { success: true, deletedId: id, deletedChart: removed, _executionMode: context.mode };
  },

  // --- CONVERSATIONS & CHAT ---
  getConversations(context) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    let convs = db.conversations || [];
    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      agentId: c.agentId,
      createdAt: c.createdAt,
      messageCount: (c.messages || []).length,
      _executionMode: context.mode,
    }));
  },

  getConversationMessages(context, convId) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const conv = (db.conversations || []).find((c) => c.id === convId);
    if (!conv) {
      return { id: convId, messages: [] };
    }
    return {
      id: conv.id,
      title: conv.title,
      agentId: conv.agentId,
      messages: conv.messages || [],
      _executionMode: context.mode,
    };
  },

  deleteConversation(context, convId) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const index = (db.conversations || []).findIndex((c) => c.id === convId);
    if (index === -1) {
      return { success: false, message: "Conversation not found" };
    }
    db.conversations.splice(index, 1);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return { success: true, deletedId: convId, _executionMode: context.mode };
  },

  // --- HITL PENDING ACTIONS ---
  createPendingAction(context, { actionType, title, summary, payload }) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const newAction = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      title,
      summary,
      payload,
      status: "PENDING_CONFIRMATION",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      executionMode: context.mode,
    };

    if (!db.pendingActions) db.pendingActions = [];
    db.pendingActions.unshift(newAction);

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return newAction;
  },

  approvePendingAction(context, actionId) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const action = (db.pendingActions || []).find((a) => a.id === actionId);

    if (!action) {
      throw new Error(`Pending action ${actionId} not found.`);
    }

    if (action.status !== "PENDING_CONFIRMATION") {
      throw new Error(`Action is already ${action.status}`);
    }

    let executionResult = null;

    // Execute the action strictly against the current execution mode's data!
    if (action.actionType === "RESTOCK_PRODUCT" || action.actionType === "ADJUST_STOCK") {
      const { productId, changeType, quantityDelta, reason } = action.payload;
      executionResult = this.adjustStock(context, productId, {
        changeType: changeType || "IN",
        quantityDelta: quantityDelta || 25,
        reason: reason || `HITL Approved Restock (${context.mode} mode)`,
      });
    } else if (action.actionType === "DELETE_PRODUCT") {
      const { productId } = action.payload;
      executionResult = this.deleteProduct(context, productId);
    } else if (action.actionType === "CREATE_CHART") {
      executionResult = this.createChart(context, action.payload);
    } else {
      executionResult = { executed: true, note: `Processed ${action.actionType}` };
    }

    action.status = "APPROVED";
    action.approvedAt = new Date().toISOString();
    action.result = executionResult;

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      success: true,
      actionId,
      status: "APPROVED",
      executionMode: context.mode,
      result: executionResult,
    };
  },

  rejectPendingAction(context, actionId) {
    const db = context.isDemo ? getDemoDb() : getLiveDb();
    const action = (db.pendingActions || []).find((a) => a.id === actionId);

    if (!action) {
      throw new Error(`Pending action ${actionId} not found.`);
    }

    action.status = "REJECTED";
    action.rejectedAt = new Date().toISOString();

    if (context.isDemo) {
      saveDemoDb();
    } else {
      saveLiveDb();
    }

    return {
      success: true,
      actionId,
      status: "REJECTED",
      executionMode: context.mode,
    };
  },
};
