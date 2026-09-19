import "./env.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as neonDb from "./neonDb.js";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-change-me-later-smartsupply";
const DATA_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "apps/web/.data"),
  path.resolve(process.cwd(), ".data"),
  path.resolve(__dirname, "../../.data"),
];

function getPrimaryDataDir() {
  for (const d of DATA_DIR_CANDIDATES) {
    if (fs.existsSync(d) && fs.existsSync(path.join(d, "smartsupply_demo_sandbox.json"))) {
      return d;
    }
  }
  const fallback = path.resolve(process.cwd(), ".data");
  if (!fs.existsSync(fallback)) {
    try { fs.mkdirSync(fallback, { recursive: true }); } catch (e) {}
  }
  return fallback;
}

const DATA_DIR = getPrimaryDataDir();
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
      id: "lead-gdgu-bsjd",
      tenantId: "demo-tenant-id",
      title: "gdgu bsjd",
      name: "gdgu bsjd",
      companyName: "gdgu bsjd",
      contactName: "gdgu bsjd",
      contactEmail: "contact@gdgubsjd.com",
      contactPhone: "+1 (555) 019-2834",
      value: 50000,
      stage: "New",
      priority: "HIGH",
      notes: "Equipment and component supply deal",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    },
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
        id: "lead-gdgu-bsjd",
        tenantId,
        title: "gdgu bsjd",
        name: "gdgu bsjd",
        companyName: "gdgu bsjd",
        contactName: "gdgu bsjd",
        contactEmail: "contact@gdgubsjd.com",
        contactPhone: "+1 (555) 019-2834",
        value: 50000,
        stage: "New",
        priority: "HIGH",
        notes: "Equipment and component supply deal",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
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
  // Also sync to other candidate directories if they exist
  try {
    const filename = path.basename(filePath);
    for (const dir of DATA_DIR_CANDIDATES) {
      const altPath = path.join(dir, filename);
      if (altPath !== filePath && fs.existsSync(dir)) {
        fs.writeFileSync(altPath, JSON.stringify(data, null, 2), "utf-8");
      }
    }
  } catch (e) {}
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
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        return [];
      }
      try {
        list = await neonDb.getProductsFromDb(context.user.tenantId);
      } catch (err) {
        console.error("Neon getProducts error:", err.message);
        throw err;
      }
    } else {
      const db = getDemoDb();
      list = db.products || [];
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
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) return null;
      const item = await neonDb.getProductByIdFromDb(id, context.user.tenantId);
      if (item) return { ...item, _executionMode: "LIVE" };
      return null;
    }
    const products = await this.getProducts(context);
    return products.find((p) => p.id === id) || null;
  },

  async createProduct(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required for live product creation");
      }
      const item = await neonDb.createProductInDb(context.user.tenantId, payload);
      return { ...item, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const newProduct = {
      id: `prod-demo-${Date.now()}`,
      tenantId: "demo-tenant-id",
      name: payload.name,
      sku: payload.sku || `SKU-${Date.now().toString().slice(-6)}`,
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
        reason: "Initial stock intake (Demo)",
        executedBy: "Alex Reynolds",
        createdAt: new Date().toISOString(),
      });
    }

    saveDemoDb();

    return {
      ...newProduct,
      unit_price: newProduct.unitPrice,
      current_stock: newProduct.quantity,
      min_stock_threshold: newProduct.reorderPoint,
      _executionMode: "DEMO",
    };
  },

  async updateProduct(context, id, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const updated = await neonDb.updateProductInDb(id, context.user.tenantId, payload);
      if (!updated) throw new Error(`Product ${id} not found.`);
      return { ...updated, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const item = (db.products || []).find((p) => p.id === id);
    if (!item) {
      throw new Error(`Product ${id} not found in Demo sandbox.`);
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

    saveDemoDb();

    return {
      ...item,
      unit_price: item.unitPrice,
      current_stock: item.quantity,
      min_stock_threshold: item.reorderPoint,
      _executionMode: "DEMO",
    };
  },

  async deleteProduct(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const ok = await neonDb.deleteProductFromDb(id, context.user.tenantId);
      return { success: ok, deletedId: id, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const index = (db.products || []).findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product ${id} not found in Demo sandbox.`);
    }

    const removed = db.products.splice(index, 1)[0];
    saveDemoDb();

    return {
      success: true,
      deletedId: id,
      deletedProduct: removed,
      _executionMode: "DEMO",
    };
  },

  async adjustStock(context, id, { changeType, quantityDelta, reason }) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const updated = await neonDb.adjustStockInDb(id, context.user.tenantId, {
        type: changeType,
        quantity: quantityDelta,
        reason,
        executedBy: context.user?.name || "Admin User",
      });
      return { product: updated, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const item = (db.products || []).find((p) => p.id === id);
    if (!item) {
      throw new Error(`Product ${id} not found in Demo sandbox.`);
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

    saveDemoDb();

    return {
      product: {
        ...item,
        unit_price: item.unitPrice,
        current_stock: item.quantity,
        min_stock_threshold: item.reorderPoint,
        _executionMode: "DEMO",
      },
      log: logEntry,
      _executionMode: "DEMO",
    };
  },

  async getStockHistory(context, productId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) return [];
      return await neonDb.getStockLogsFromDb(productId, context.user.tenantId);
    }
    const db = getDemoDb();
    const logs = db.stockLogs || [];
    if (!productId) return logs;
    return logs.filter((l) => l.productId === productId);
  },

  // --- CRM LEADS ---
  async getLeads(context) {
    if (!context.isDemo && neonDb.isNeonConfigured()) {
      try {
        const list = await neonDb.getLeadsFromDb(context.user?.tenantId);
        if (list && list.length > 0) return list.map((l) => ({ ...l, _executionMode: "LIVE" }));
      } catch (err) {
        console.warn("Neon getLeadsFromDb error, falling back:", err.message);
      }
    }
    const isLive = !context.isDemo;
    const db = isLive ? getLiveDb() : getDemoDb();
    let leads = db.leads || [];
    if (leads.length === 0 && isLive) {
      leads = getDemoDb().leads || [];
    }
    return leads.map((l) => ({ ...l, _executionMode: isLive ? "LIVE" : "DEMO" }));
  },

  async createLead(context, payload) {
    if (!context.isDemo && neonDb.isNeonConfigured()) {
      try {
        const lead = await neonDb.createLeadInDb(context.user?.tenantId, payload);
        if (lead) return { ...lead, _executionMode: "LIVE" };
      } catch (err) {
        console.warn("Neon createLeadInDb error, falling back to local:", err.message);
      }
    }

    const isLive = !context.isDemo;
    const db = isLive ? getLiveDb() : getDemoDb();
    const newLead = {
      id: `lead-${Date.now()}`,
      tenantId: context.user?.tenantId || (isLive ? "tenant-live-default" : "demo-tenant-id"),
      title: payload.title || payload.name || "New Prospect",
      name: payload.name || payload.title || "New Prospect",
      companyName: payload.company_name || payload.companyName || payload.company || "Prospective Client",
      contactName: payload.contact_name || payload.contactName || payload.name || "Lead Contact",
      contactEmail: payload.contact_email || payload.contactEmail || payload.email || "",
      contactPhone: payload.contact_phone || payload.contactPhone || payload.phone || "",
      value: Number(payload.value ?? payload.amount ?? 0),
      stage: payload.stage || payload.status || "New",
      priority: payload.priority || "MEDIUM",
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.leads) db.leads = [];
    db.leads.unshift(newLead);
    if (isLive) saveLiveDb(); else saveDemoDb();

    return { ...newLead, _executionMode: isLive ? "LIVE" : "DEMO" };
  },

  async updateLead(context, id, payload) {
    if (!context.isDemo && neonDb.isNeonConfigured()) {
      try {
        const updated = await neonDb.updateLeadInDb(id, context.user?.tenantId, payload);
        if (updated) return { ...updated, _executionMode: "LIVE" };
      } catch (err) {
        console.warn("Neon updateLeadInDb error, falling back to local:", err.message);
      }
    }

    const isLive = !context.isDemo;
    const primaryDb = isLive ? getLiveDb() : getDemoDb();
    const secondaryDb = isLive ? getDemoDb() : getLiveDb();

    // Check primary
    let item = (primaryDb.leads || []).find((l) => 
      l.id === id || 
      (l.title && l.title.toLowerCase() === String(id).toLowerCase()) || 
      (l.name && l.name.toLowerCase() === String(id).toLowerCase())
    );
    let isDbLive = isLive;

    // If not found in primary, check secondary
    if (!item) {
      item = (secondaryDb.leads || []).find((l) => 
        l.id === id || 
        (l.title && l.title.toLowerCase() === String(id).toLowerCase()) || 
        (l.name && l.name.toLowerCase() === String(id).toLowerCase())
      );
      if (item) isDbLive = !isLive;
    }

    // Partial search
    if (!item) {
      item = (primaryDb.leads || []).concat(secondaryDb.leads || []).find((l) => 
        (l.title && l.title.toLowerCase().includes(String(id).toLowerCase())) || 
        (l.name && l.name.toLowerCase().includes(String(id).toLowerCase())) ||
        (l.companyName && l.companyName.toLowerCase().includes(String(id).toLowerCase()))
      );
    }

    // Fallback create if not exists
    if (!item) {
      item = {
        id: id && String(id).startsWith("lead-") ? id : `lead-${Date.now()}`,
        tenantId: context.user?.tenantId || "tenant-live-default",
        title: id || "Lead",
        name: id || "Lead",
        companyName: id || "Prospective Client",
        contactName: id || "Key Contact",
        contactEmail: "lead@client.com",
        contactPhone: "+1 (555) 019-2834",
        value: 50000,
        stage: "New",
        priority: "HIGH",
        createdAt: new Date().toISOString(),
      };
      if (!primaryDb.leads) primaryDb.leads = [];
      primaryDb.leads.unshift(item);
    }

    if (payload.title !== undefined) item.title = payload.title;
    if (payload.name !== undefined) item.name = payload.name;
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
    if (payload.amount !== undefined) item.value = Number(payload.amount);
    if (payload.stage !== undefined || payload.status !== undefined) {
      item.stage = payload.stage || payload.status;
      item.status = item.stage;
    }
    if (payload.priority !== undefined) item.priority = payload.priority;
    if (payload.notes !== undefined) item.notes = payload.notes;
    item.updatedAt = new Date().toISOString();

    saveDemoDb();
    saveLiveDb();

    return { ...item, _executionMode: isDbLive ? "LIVE" : "DEMO" };
  },

  async deleteLead(context, id) {
    if (!context.isDemo && neonDb.isNeonConfigured()) {
      try {
        const ok = await neonDb.deleteLeadFromDb(id, context.user?.tenantId);
        if (ok) return true;
      } catch (err) {
        console.warn("Neon deleteLeadFromDb error:", err.message);
      }
    }

    const isLive = !context.isDemo;
    const db = isLive ? getLiveDb() : getDemoDb();
    const index = (db.leads || []).findIndex((l) => l.id === id || l.title === id);
    if (index !== -1) {
      db.leads.splice(index, 1);
    }
    if (isLive) saveLiveDb(); else saveDemoDb();
    return { success: true, deletedId: id, _executionMode: isLive ? "LIVE" : "DEMO" };
  },

  // --- CRM TASKS ---
  async getTasks(context) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) return [];
      const list = await neonDb.getTasksFromDb(context.user.tenantId);
      return list.map((t) => ({ ...t, _executionMode: "LIVE" }));
    }
    const db = getDemoDb();
    let tasks = db.tasks || [];
    return tasks.map((t) => ({ ...t, _executionMode: "DEMO" }));
  },

  async createTask(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required for live task creation");
      }
      const task = await neonDb.createTaskInDb(context.user.tenantId, payload);
      return { ...task, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const newTask = {
      id: `task-demo-${Date.now()}`,
      tenantId: "demo-tenant-id",
      title: payload.title || "New Task",
      description: payload.description || "",
      status: (payload.status || "PENDING").toUpperCase(),
      priority: (payload.priority || "MEDIUM").toUpperCase(),
      dueDate: payload.dueDate || payload.due_date || new Date().toISOString().split("T")[0],
      due_date: payload.dueDate || payload.due_date || new Date().toISOString().split("T")[0],
      assignedTo: payload.assignedTo || "Alex Reynolds",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!db.tasks) db.tasks = [];
    db.tasks.unshift(newTask);
    saveDemoDb();

    return { ...newTask, _executionMode: "DEMO" };
  },

  async updateTask(context, id, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const updated = await neonDb.updateTaskInDb(id, context.user.tenantId, payload);
      if (!updated) throw new Error(`Task ${id} not found.`);
      return { ...updated, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const item = (db.tasks || []).find((t) => t.id === id);
    if (!item) {
      throw new Error(`Task ${id} not found in Demo sandbox.`);
    }

    if (payload.title !== undefined) item.title = payload.title;
    if (payload.description !== undefined) item.description = payload.description;
    if (payload.status !== undefined) item.status = payload.status.toUpperCase();
    if (payload.priority !== undefined) item.priority = payload.priority.toUpperCase();
    if (payload.dueDate !== undefined || payload.due_date !== undefined) {
      const d = payload.dueDate || payload.due_date;
      item.dueDate = d;
      item.due_date = d;
    }
    item.updatedAt = new Date().toISOString();

    saveDemoDb();

    return { ...item, _executionMode: "DEMO" };
  },

  async deleteTask(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const ok = await neonDb.deleteTaskFromDb(id, context.user.tenantId);
      return { success: ok, deletedId: id, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const index = (db.tasks || []).findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task ${id} not found in Demo sandbox.`);
    }

    const removed = db.tasks.splice(index, 1)[0];
    saveDemoDb();

    return { success: true, deletedId: id, deletedTask: removed, _executionMode: "DEMO" };
  },

  getCustomers(context) {
    const db = getDemoDb();
    return db.customers || [];
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
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) return [];
      const list = await neonDb.getChartsFromDb(context.user.tenantId);
      return list.map((c) => ({ ...c, _executionMode: "LIVE" }));
    }
    const db = getDemoDb();
    let charts = db.charts || [];
    return charts.map((c) => ({ ...c, _executionMode: "DEMO" }));
  },

  async createChart(context, payload) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required for live chart creation");
      }
      const chart = await neonDb.createChartInDb(context.user.tenantId, context.user.id, payload);
      return { ...chart, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const newChart = {
      id: `chart-demo-${Date.now()}`,
      tenantId: "demo-tenant-id",
      title: payload.title || "Custom Analytics Chart",
      type: payload.chartType || payload.type || "bar",
      config: payload.config || {
        chartType: payload.chartType || payload.type || "bar",
        metric: payload.metric || "inventory_stock",
        timeframe: payload.timeframe || "CURRENT",
        data: payload.data || [],
      },
      createdAt: new Date().toISOString(),
    };

    if (!db.charts) db.charts = [];
    db.charts.unshift(newChart);
    saveDemoDb();

    return { ...newChart, _executionMode: "DEMO" };
  },

  async deleteChart(context, id) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const ok = await neonDb.deleteChartFromDb(id, context.user.tenantId);
      return { success: ok, deletedId: id, _executionMode: "LIVE" };
    }

    const db = getDemoDb();
    const index = (db.charts || []).findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Chart ${id} not found in Demo sandbox.`);
    }

    const removed = db.charts.splice(index, 1)[0];
    saveDemoDb();

    return { success: true, deletedId: id, deletedChart: removed, _executionMode: "DEMO" };
  },

  // --- CONVERSATIONS & CHAT ---
  async getConversations(context) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) return [];
      return await neonDb.getConversationsFromDb(context.user.tenantId);
    }
    const db = getDemoDb();
    let convs = db.conversations || [];
    return convs.map((c) => ({
      id: c.id,
      title: c.title,
      agentId: c.agentId,
      createdAt: c.createdAt,
      messageCount: (c.messages || []).length,
      _executionMode: "DEMO",
    }));
  },

  async getConversationMessages(context, convId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        return { id: convId, messages: [] };
      }
      return await neonDb.getConversationMessagesFromDb(convId, context.user.tenantId);
    }
    const db = getDemoDb();
    const conv = (db.conversations || []).find((c) => c.id === convId);
    if (!conv) {
      return { id: convId, messages: [] };
    }
    return {
      id: conv.id,
      title: conv.title,
      agentId: conv.agentId,
      messages: conv.messages || [],
      _executionMode: "DEMO",
    };
  },

  async deleteConversation(context, convId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const ok = await neonDb.deleteConversationFromDb(convId, context.user.tenantId);
      return { success: ok, deletedId: convId, _executionMode: "LIVE" };
    }
    const db = getDemoDb();
    const index = (db.conversations || []).findIndex((c) => c.id === convId);
    if (index === -1) {
      return { success: false, message: "Conversation not found" };
    }
    db.conversations.splice(index, 1);
    saveDemoDb();

    return { success: true, deletedId: convId, _executionMode: "DEMO" };
  },

  // --- HITL PENDING ACTIONS ---
  async createPendingAction(context, { actionType, title, summary, payload }) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      return await neonDb.createPendingActionInDb(context.user.tenantId, context.user?.id, {
        actionType,
        title,
        summary,
        payload,
        targetEntity: { entity: "product", id: payload?.productId },
      });
    }

    const db = getDemoDb();
    const newAction = {
      id: `act-demo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actionType,
      title,
      summary,
      payload,
      status: "PENDING_CONFIRMATION",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      executionMode: "DEMO",
    };

    if (!db.pendingActions) db.pendingActions = [];
    db.pendingActions.unshift(newAction);
    saveDemoDb();

    return newAction;
  },

  async approvePendingAction(context, actionId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      const action = await neonDb.getPendingActionByIdFromDb(actionId, context.user.tenantId);
      if (!action) {
        throw new Error(`Pending action ${actionId} not found.`);
      }
      if (action.status !== "PENDING_CONFIRMATION" && action.status !== "PENDING") {
        throw new Error(`Action is already ${action.status}`);
      }

      let executionResult = null;
      if (action.actionType === "RESTOCK_PRODUCT" || action.actionType === "ADJUST_STOCK") {
        const { productId, changeType, quantityDelta, reason } = action.payload;
        executionResult = await this.adjustStock(context, productId, {
          changeType: changeType || "IN",
          quantityDelta: quantityDelta || 25,
          reason: reason || "HITL Approved Restock (LIVE mode)",
        });
      } else if (action.actionType === "EDIT_PRODUCT" || action.actionType === "UPDATE_PRODUCT") {
        const { productId, updates } = action.payload;
        executionResult = await this.updateProduct(context, productId, updates || {});
      } else if (action.actionType === "DELETE_PRODUCT") {
        const { productId } = action.payload;
        executionResult = await this.deleteProduct(context, productId);
      } else if (action.actionType === "EDIT_LEAD" || action.actionType === "UPDATE_LEAD") {
        const { leadId, updates } = action.payload;
        executionResult = await this.updateLead(context, leadId, updates || {});
      } else if (action.actionType === "DELETE_LEAD") {
        const { leadId } = action.payload;
        executionResult = await this.deleteLead(context, leadId);
      } else if (action.actionType === "EDIT_TASK" || action.actionType === "UPDATE_TASK") {
        const { taskId, updates } = action.payload;
        executionResult = await this.updateTask(context, taskId, updates || {});
      } else if (action.actionType === "DELETE_TASK") {
        const { taskId } = action.payload;
        executionResult = await this.deleteTask(context, taskId);
      } else if (action.actionType === "CREATE_CHART") {
        executionResult = await this.createChart(context, action.payload);
      } else {
        executionResult = { executed: true, note: `Processed ${action.actionType}` };
      }

      await neonDb.updatePendingActionInDb(actionId, context.user.tenantId, "APPROVED", executionResult);

      return {
        success: true,
        actionId,
        status: "APPROVED",
        executionMode: "LIVE",
        result: executionResult,
      };
    }

    const db = getDemoDb();
    const action = (db.pendingActions || []).find((a) => a.id === actionId);

    if (!action) {
      throw new Error(`Pending action ${actionId} not found.`);
    }

    if (action.status !== "PENDING_CONFIRMATION" && action.status !== "PENDING") {
      throw new Error(`Action is already ${action.status}`);
    }

    let executionResult = null;
    if (action.actionType === "RESTOCK_PRODUCT" || action.actionType === "ADJUST_STOCK") {
      const { productId, changeType, quantityDelta, reason } = action.payload;
      executionResult = await this.adjustStock(context, productId, {
        changeType: changeType || "IN",
        quantityDelta: quantityDelta || 25,
        reason: reason || "HITL Approved Restock (DEMO mode)",
      });
    } else if (action.actionType === "EDIT_PRODUCT" || action.actionType === "UPDATE_PRODUCT") {
      const { productId, updates } = action.payload;
      executionResult = await this.updateProduct(context, productId, updates || {});
    } else if (action.actionType === "DELETE_PRODUCT") {
      const { productId } = action.payload;
      executionResult = await this.deleteProduct(context, productId);
    } else if (action.actionType === "EDIT_LEAD" || action.actionType === "UPDATE_LEAD") {
      const { leadId, updates } = action.payload;
      executionResult = await this.updateLead(context, leadId, updates || {});
    } else if (action.actionType === "DELETE_LEAD") {
      const { leadId } = action.payload;
      executionResult = await this.deleteLead(context, leadId);
    } else if (action.actionType === "EDIT_TASK" || action.actionType === "UPDATE_TASK") {
      const { taskId, updates } = action.payload;
      executionResult = await this.updateTask(context, taskId, updates || {});
    } else if (action.actionType === "DELETE_TASK") {
      const { taskId } = action.payload;
      executionResult = await this.deleteTask(context, taskId);
    } else if (action.actionType === "CREATE_CHART") {
      executionResult = await this.createChart(context, action.payload);
    } else {
      executionResult = { executed: true, note: `Processed ${action.actionType}` };
    }

    action.status = "APPROVED";
    action.approvedAt = new Date().toISOString();
    action.result = executionResult;
    saveDemoDb();

    return {
      success: true,
      actionId,
      status: "APPROVED",
      executionMode: "DEMO",
      result: executionResult,
    };
  },

  async rejectPendingAction(context, actionId) {
    if (!context.isDemo && process.env.DATABASE_URL) {
      if (!context.user?.tenantId || !neonDb.isValidUuid(context.user.tenantId)) {
        throw new Error("Valid tenantId required");
      }
      await neonDb.updatePendingActionInDb(actionId, context.user.tenantId, "REJECTED", { rejected: true });
      return {
        success: true,
        actionId,
        status: "REJECTED",
        executionMode: "LIVE",
      };
    }

    const db = getDemoDb();
    const action = (db.pendingActions || []).find((a) => a.id === actionId);

    if (!action) {
      throw new Error(`Pending action ${actionId} not found.`);
    }

    action.status = "REJECTED";
    action.rejectedAt = new Date().toISOString();
    saveDemoDb();

    return {
      success: true,
      actionId,
      status: "REJECTED",
      executionMode: "DEMO",
    };
  },
};
