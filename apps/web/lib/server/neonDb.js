import "./env.js";
import { Pool } from "pg";
import crypto from "crypto";

let pool = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(str) {
  return typeof str === "string" && UUID_REGEX.test(str.trim());
}

export function isNeonConfigured() {
  return Boolean(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USER));
}

export function getNeonPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString && process.env.DB_HOST && process.env.DB_USER) {
      const user = encodeURIComponent(process.env.DB_USER);
      const password = encodeURIComponent(process.env.DB_PASSWORD || "");
      const host = process.env.DB_HOST;
      const port = process.env.DB_PORT || 5432;
      const dbName = process.env.DB_NAME || "smartsupply";
      connectionString = `postgresql://${user}:${password}@${host}:${port}/${dbName}?sslmode=require`;
    }

    if (connectionString) {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000,
      });

      pool.on("error", (err) => {
        console.error("Neon PostgreSQL client error:", err.message);
      });
    }
  }
  return pool;
}

export async function testNeonConnection() {
  const p = getNeonPool();
  if (!p) return { ok: false, error: "Neon database is not configured in environment" };
  try {
    const res = await p.query("SELECT current_database(), current_user, version();");
    return { ok: true, data: res.rows[0] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// -------------------------------------------------------------
// USER & TENANT QUERIES
// -------------------------------------------------------------
export function normalizeUserRow(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id || row.user_id || row.userId || crypto.randomUUID(),
    tenantId: row.tenantId || row.tenant_id || row.tenantid || "default-tenant",
    email: row.email,
    passwordHash: row.passwordHash || row.password_hash || row.passwordhash || row.password,
    name: row.name || row.full_name || row.username || row.email?.split("@")[0] || "User",
    role: row.role || "ADMIN",
    isActive: row.isActive !== false && row.is_active !== false && row.isactive !== false,
    isDemo: row.isDemo === true || row.is_demo === true || row.isdemo === true,
  };
}

export async function findUserByEmail(email) {
  const p = getNeonPool();
  if (!p || !email) return null;
  const cleanEmail = email.trim().toLowerCase();
  
  // Try lowercase users table without strict quotes on isActive
  try {
    const res = await p.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
      [cleanEmail]
    );
    if (res.rows[0]) return normalizeUserRow(res.rows[0]);
  } catch (err1) {
    try {
      const res2 = await p.query(
        'SELECT * FROM "Users" WHERE LOWER(email) = LOWER($1) LIMIT 1;',
        [cleanEmail]
      );
      if (res2.rows[0]) return normalizeUserRow(res2.rows[0]);
    } catch (err2) {
      console.warn("Neon findUserByEmail error:", err2.message);
    }
  }
  return null;
}

export async function findUserById(id) {
  const p = getNeonPool();
  if (!p || !id) return null;
  try {
    const res = await p.query('SELECT * FROM users WHERE id::text = $1 LIMIT 1;', [String(id)]);
    if (res.rows[0]) return normalizeUserRow(res.rows[0]);
  } catch {
    try {
      const res2 = await p.query('SELECT * FROM "Users" WHERE id::text = $1 LIMIT 1;', [String(id)]);
      if (res2.rows[0]) return normalizeUserRow(res2.rows[0]);
    } catch {}
  }
  return null;
}

export async function updateUserPasswordInDb(userId, passwordHash) {
  const p = getNeonPool();
  if (!p || !userId) return false;
  try {
    await p.query(
      'UPDATE users SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id::text = $2 OR LOWER(email) = LOWER($2);',
      [passwordHash, String(userId)]
    );
    return true;
  } catch {
    try {
      await p.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id::text = $2 OR LOWER(email) = LOWER($2);',
        [passwordHash, String(userId)]
      );
      return true;
    } catch (err) {
      console.warn("Neon updateUserPasswordInDb error:", err.message);
      return false;
    }
  }
}

export async function findTenantById(id) {
  const p = getNeonPool();
  if (!p || !id) return { id: String(id || "tenant-default"), name: "Enterprise Global Logistics" };
  try {
    const res = await p.query('SELECT * FROM tenants WHERE id::text = $1 LIMIT 1;', [String(id)]);
    if (res.rows[0]) return res.rows[0];
  } catch {
    try {
      const res2 = await p.query('SELECT * FROM "Tenants" WHERE id::text = $1 LIMIT 1;', [String(id)]);
      if (res2.rows[0]) return res2.rows[0];
    } catch {}
  }
  return { id: String(id), name: "Enterprise Global Logistics" };
}

export async function createTenantInDb({ id, name, slug }) {
  const p = getNeonPool();
  const tenantId = id && isValidUuid(id) ? id : crypto.randomUUID();
  const tenantSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]/g, "-") + `-${Date.now().toString().slice(-4)}`;
  try {
    const res = await p.query(
      'INSERT INTO tenants (id, name, slug, "isActive", "isDemo", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, false, NOW(), NOW()) RETURNING *;',
      [tenantId, name, tenantSlug]
    );
    return res.rows[0];
  } catch {
    const res = await p.query(
      'INSERT INTO tenants (id, name, slug, is_active, is_demo, created_at, updated_at) VALUES ($1, $2, $3, true, false, NOW(), NOW()) RETURNING *;',
      [tenantId, name, tenantSlug]
    );
    return res.rows[0];
  }
}

export async function createUserInDb({ id, tenantId, email, passwordHash, name, role }) {
  const p = getNeonPool();
  const userId = id && isValidUuid(id) ? id : crypto.randomUUID();
  const cleanEmail = email.toLowerCase().trim();
  const userName = name || cleanEmail.split("@")[0];
  const userRole = role || "ADMIN";

  try {
    const res = await p.query(
      'INSERT INTO users (id, "tenantId", email, "passwordHash", name, role, "isActive", "isDemo", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW(), NOW()) RETURNING id, "tenantId", email, name, role, "isActive", "createdAt";',
      [userId, tenantId, cleanEmail, passwordHash, userName, userRole]
    );
    return normalizeUserRow(res.rows[0]);
  } catch {
    const res = await p.query(
      'INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, is_demo, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW(), NOW()) RETURNING *;',
      [userId, tenantId, cleanEmail, passwordHash, userName, userRole]
    );
    return normalizeUserRow(res.rows[0]);
  }
}

// -------------------------------------------------------------
// PRODUCT / INVENTORY QUERIES
// -------------------------------------------------------------
function normalizeProduct(p) {
  if (!p) return null;
  const qty = Number(p.quantity ?? p.current_stock ?? 0);
  const price = Number(p.unitPrice ?? p.unit_price ?? 0);
  const reorder = Number(p.reorderPoint ?? p.min_stock_threshold ?? 10);
  return {
    ...p,
    quantity: qty,
    current_stock: qty,
    unitPrice: price,
    unit_price: price,
    reorderPoint: reorder,
    min_stock_threshold: reorder,
    category: p.category || "General",
    sku: p.sku || "SKU-GEN",
    name: p.name || "Unnamed Product",
    description: p.description || "",
  };
}

export async function getProductsFromDb(tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return [];
  const res = await p.query('SELECT * FROM products WHERE "tenantId" = $1 ORDER BY "createdAt" DESC;', [tenantId]);
  return res.rows.map(normalizeProduct);
}

export async function getProductByIdFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return null;
  const res = await p.query('SELECT * FROM products WHERE id = $1 AND "tenantId" = $2 LIMIT 1;', [id, tenantId]);
  return normalizeProduct(res.rows[0]);
}

export async function createProductInDb(tenantId, data) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) throw new Error("Valid tenantId is required");
  const id = data.id && isValidUuid(data.id) ? data.id : crypto.randomUUID();
  const name = data.name || "New Product";
  const sku = data.sku || `SKU-${Date.now().toString().slice(-6)}`;
  const description = data.description || "";
  const quantity = Math.max(0, parseInt(data.quantity ?? data.current_stock ?? 0, 10));
  const reorderPoint = Math.max(0, parseInt(data.reorderPoint ?? data.min_stock_threshold ?? 10, 10));
  const unitPrice = Math.max(0, parseFloat(data.unitPrice ?? data.unit_price ?? 0));
  const category = data.category || "General";
  const supplierEmail = data.supplierEmail || data.supplier_email || null;

  const res = await p.query(
    `INSERT INTO products (id, "tenantId", sku, name, description, quantity, "reorderPoint", "unitPrice", category, "supplierEmail", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING *;`,
    [id, tenantId, sku, name, description, quantity, reorderPoint, unitPrice, category, supplierEmail]
  );
  return normalizeProduct(res.rows[0]);
}

export async function updateProductInDb(id, tenantId, data) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return null;
  const existing = await getProductByIdFromDb(id, tenantId);
  if (!existing) return null;

  const name = data.name !== undefined ? data.name : existing.name;
  const sku = data.sku !== undefined ? data.sku : existing.sku;
  const description = data.description !== undefined ? data.description : existing.description;
  const quantity = data.quantity !== undefined || data.current_stock !== undefined
    ? Math.max(0, parseInt(data.quantity ?? data.current_stock, 10))
    : existing.quantity;
  const reorderPoint = data.reorderPoint !== undefined || data.min_stock_threshold !== undefined
    ? Math.max(0, parseInt(data.reorderPoint ?? data.min_stock_threshold, 10))
    : existing.reorderPoint;
  const unitPrice = data.unitPrice !== undefined || data.unit_price !== undefined
    ? Math.max(0, parseFloat(data.unitPrice ?? data.unit_price))
    : existing.unitPrice;
  const category = data.category !== undefined ? data.category : existing.category;

  const res = await p.query(
    `UPDATE products 
     SET name = $1, sku = $2, description = $3, quantity = $4, "reorderPoint" = $5, "unitPrice" = $6, category = $7, "updatedAt" = NOW()
     WHERE id = $8 AND "tenantId" = $9
     RETURNING *;`,
    [name, sku, description, quantity, reorderPoint, unitPrice, category, id, tenantId]
  );
  return normalizeProduct(res.rows[0]);
}

export async function deleteProductFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return false;
  // delete related stock logs first to avoid FK error
  await p.query('DELETE FROM stock_logs WHERE "productId" = $1 AND "tenantId" = $2;', [id, tenantId]);
  const res = await p.query('DELETE FROM products WHERE id = $1 AND "tenantId" = $2 RETURNING id;', [id, tenantId]);
  return res.rowCount > 0;
}

export async function adjustStockInDb(id, tenantId, { type, quantity, reason, executedBy }) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) throw new Error("Product not found");
  const product = await getProductByIdFromDb(id, tenantId);
  if (!product) throw new Error("Product not found");

  const qtyDelta = parseInt(quantity, 10);
  const prevQty = product.quantity;
  let newQty = prevQty;

  const normType = (type || "ADJUSTMENT").toUpperCase();
  if (normType === "IN") {
    newQty = prevQty + Math.abs(qtyDelta);
  } else if (normType === "OUT") {
    newQty = Math.max(0, prevQty - Math.abs(qtyDelta));
  } else {
    newQty = Math.max(0, qtyDelta);
  }

  const updateRes = await p.query(
    'UPDATE products SET quantity = $1, "updatedAt" = NOW() WHERE id = $2 AND "tenantId" = $3 RETURNING *;',
    [newQty, id, tenantId]
  );

  const logId = crypto.randomUUID();
  await p.query(
    `INSERT INTO stock_logs (id, "tenantId", "productId", "changeType", "quantityChanged", "previousQuantity", "newQuantity", reason, "performedBy", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW());`,
    [logId, tenantId, id, normType, newQty - prevQty, prevQty, newQty, reason || "Stock manual adjustment", executedBy || "System"]
  );

  return normalizeProduct(updateRes.rows[0]);
}

export async function getStockLogsFromDb(productId, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(productId) || !isValidUuid(tenantId)) return [];
  const res = await p.query(
    `SELECT sl.*, p.name as "productName", p.sku
     FROM stock_logs sl
     LEFT JOIN products p ON sl."productId" = p.id
     WHERE sl."productId" = $1 AND sl."tenantId" = $2
     ORDER BY sl."createdAt" DESC
     LIMIT 50;`,
    [productId, tenantId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    sku: r.sku,
    changeType: r.changeType,
    quantityDelta: r.quantityChanged,
    previousQuantity: r.previousQuantity,
    newQuantity: r.newQuantity,
    reason: r.reason,
    executedBy: r.performedBy || "System",
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
  }));
}

// -------------------------------------------------------------
// CRM LEADS QUERIES
// -------------------------------------------------------------
function normalizeLead(l) {
  if (!l) return null;
  const val = Number(l.value || 0);
  const st = l.status || l.stage || "Qualified";
  return {
    ...l,
    title: l.name || l.title || `${l.company || "Enterprise"} Contract`,
    companyName: l.company || l.companyName || "Enterprise Corp",
    contactName: l.name || "Key Contact",
    contactEmail: l.email || "contact@client.com",
    contactPhone: l.contactPhone || l.phone || "+1 (555) 019-2834",
    stage: st,
    status: st,
    value: val,
    priority: l.priority || (val > 100000 ? "HIGH" : val > 50000 ? "MEDIUM" : "LOW"),
    notes: l.description || l.notes || `Opportunity for ${l.company || "client"}`,
    createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function getLeadsFromDb(tenantId) {
  const p = getNeonPool();
  if (!p) return [];
  try {
    if (tenantId) {
      const res = await p.query(
        'SELECT * FROM leads WHERE "tenantId"::text = $1 OR tenant_id::text = $1 ORDER BY "createdAt" DESC;',
        [String(tenantId)]
      ).catch(() => p.query('SELECT * FROM leads ORDER BY created_at DESC;'));
      return res.rows.map(normalizeLead);
    }
    const res = await p.query('SELECT * FROM leads ORDER BY "createdAt" DESC;');
    return res.rows.map(normalizeLead);
  } catch (err) {
    console.warn("Neon getLeadsFromDb error:", err.message);
    return [];
  }
}

export async function createLeadInDb(tenantId, data) {
  const p = getNeonPool();
  if (!p) throw new Error("Database connection not established");
  const id = data.id && isValidUuid(data.id) ? data.id : crypto.randomUUID();
  const name = data.name || data.title || data.contactName || "New Lead";
  const email = data.email || data.contactEmail || "contact@example.com";
  const company = data.company || data.companyName || "Prospective Client";
  const status = data.status || data.stage || "New";
  const value = Math.max(0, parseFloat(data.value ?? data.amount ?? 0));
  const source = data.source || "Direct";
  const assignedTo = data.assignedTo || "Account Manager";

  try {
    const res = await p.query(
      `INSERT INTO leads (id, "tenantId", name, email, company, status, value, source, "assignedTo", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *;`,
      [id, tenantId || "default-tenant", name, email, company, status, value, source, assignedTo]
    );
    return normalizeLead(res.rows[0]);
  } catch {
    const res = await p.query(
      `INSERT INTO leads (id, tenant_id, name, email, company, status, value, source, assigned_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *;`,
      [id, tenantId || "default-tenant", name, email, company, status, value, source, assignedTo]
    );
    return normalizeLead(res.rows[0]);
  }
}

export async function updateLeadInDb(id, tenantId, data) {
  const p = getNeonPool();
  if (!p || !id) return null;
  try {
    let existingRes = null;
    try {
      existingRes = await p.query(
        'SELECT * FROM leads WHERE (id::text = $1 OR name ILIKE $1 OR title ILIKE $1) LIMIT 1;',
        [String(id)]
      );
    } catch {
      existingRes = await p.query(
        'SELECT * FROM leads WHERE (id::text = $1 OR name ILIKE $1) LIMIT 1;',
        [String(id)]
      );
    }

    if (!existingRes || !existingRes.rows.length) {
      // Partial name match
      existingRes = await p.query(
        'SELECT * FROM leads WHERE name ILIKE $1 OR company ILIKE $1 LIMIT 1;',
        [`%${id}%`]
      );
    }

    if (!existingRes || !existingRes.rows.length) return null;
    const existing = existingRes.rows[0];

    const name = data.name || data.title || existing.name;
    const email = data.email || data.contactEmail || existing.email;
    const company = data.company || data.companyName || existing.company;
    const status = data.stage || data.status || existing.status;
    const value = data.value !== undefined
      ? parseFloat(data.value)
      : (data.amount !== undefined ? parseFloat(data.amount) : existing.value);

    try {
      const res = await p.query(
        `UPDATE leads 
         SET name = $1, email = $2, company = $3, status = $4, value = $5, "updatedAt" = NOW()
         WHERE id = $6
         RETURNING *;`,
        [name, email, company, status, value, existing.id]
      );
      return normalizeLead(res.rows[0]);
    } catch {
      const res = await p.query(
        `UPDATE leads 
         SET name = $1, email = $2, company = $3, status = $4, value = $5, updated_at = NOW()
         WHERE id = $6
         RETURNING *;`,
        [name, email, company, status, value, existing.id]
      );
      return normalizeLead(res.rows[0]);
    }
  } catch (err) {
    console.warn("Neon updateLeadInDb error:", err.message);
    return null;
  }
}

export async function deleteLeadFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !id) return false;
  try {
    if (tenantId && isValidUuid(tenantId)) {
      const res = await p.query('DELETE FROM leads WHERE id::text = $1 AND "tenantId" = $2 RETURNING id;', [String(id), tenantId]);
      return res.rowCount > 0;
    }
    const res = await p.query('DELETE FROM leads WHERE id::text = $1 RETURNING id;', [String(id)]);
    return res.rowCount > 0;
  } catch (err) {
    console.warn("Neon deleteLeadFromDb error:", err.message);
    return false;
  }
}

// -------------------------------------------------------------
// CRM TASKS QUERIES
// -------------------------------------------------------------
function normalizeTask(t) {
  if (!t) return null;
  const due = t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  return {
    ...t,
    due_date: due,
    dueDate: due,
    title: t.title || "Untitled Task",
    status: t.status || "PENDING",
    priority: t.priority || "MEDIUM",
  };
}

export async function getTasksFromDb(tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return [];
  const res = await p.query('SELECT * FROM tasks WHERE "tenantId" = $1 ORDER BY "createdAt" DESC;', [tenantId]);
  return res.rows.map(normalizeTask);
}

export async function createTaskInDb(tenantId, data) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) throw new Error("Valid tenantId is required");
  const id = data.id && isValidUuid(data.id) ? data.id : crypto.randomUUID();
  const title = data.title || "New Task";
  const description = data.description || "";
  const status = (data.status || "PENDING").toUpperCase();
  const priority = (data.priority || "MEDIUM").toUpperCase();
  const rawDue = (data.dueDate || data.due_date || "").toString().trim();
  const dueDate = rawDue ? new Date(rawDue).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString();
  const assignedTo = data.assignedTo || "Team Member";

  const res = await p.query(
    `INSERT INTO tasks (id, "tenantId", title, description, status, priority, "dueDate", "assignedTo", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING *;`,
    [id, tenantId, title, description, status, priority, dueDate, assignedTo]
  );
  return normalizeTask(res.rows[0]);
}

export async function updateTaskInDb(id, tenantId, data) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return null;
  const existingRes = await p.query('SELECT * FROM tasks WHERE id = $1 AND "tenantId" = $2 LIMIT 1;', [id, tenantId]);
  if (!existingRes.rows.length) return null;
  const existing = existingRes.rows[0];

  const title = data.title !== undefined ? data.title : existing.title;
  const description = data.description !== undefined ? data.description : existing.description;
  const status = data.status !== undefined ? data.status.toUpperCase() : existing.status;
  const priority = data.priority !== undefined ? data.priority.toUpperCase() : existing.priority;
  const rawDue = (data.dueDate || data.due_date || "").toString().trim();
  const dueDate = rawDue ? new Date(rawDue).toISOString() : existing.dueDate;

  const res = await p.query(
    `UPDATE tasks 
     SET title = $1, description = $2, status = $3, priority = $4, "dueDate" = $5, "updatedAt" = NOW()
     WHERE id = $6 AND "tenantId" = $7
     RETURNING *;`,
    [title, description, status, priority, dueDate, id, tenantId]
  );
  return normalizeTask(res.rows[0]);
}

export async function deleteTaskFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return false;
  const res = await p.query('DELETE FROM tasks WHERE id = $1 AND "tenantId" = $2 RETURNING id;', [id, tenantId]);
  return res.rowCount > 0;
}

// -------------------------------------------------------------
// CHARTS QUERIES
// -------------------------------------------------------------
export async function getChartsFromDb(tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return [];
  const res = await p.query('SELECT * FROM charts WHERE "tenantId" = $1 ORDER BY "createdAt" DESC;', [tenantId]);
  return res.rows;
}

export async function createChartInDb(tenantId, userId, data) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) throw new Error("Valid tenantId is required");
  const id = data.id && isValidUuid(data.id) ? data.id : crypto.randomUUID();
  const title = data.title || "Custom Chart";
  const type = data.type || "bar";
  const config = data.config || {};
  const thumbnail = data.thumbnail || null;
  const userFk = isValidUuid(userId) ? userId : null;

  const res = await p.query(
    `INSERT INTO charts (id, "tenantId", "userId", title, type, config, thumbnail, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *;`,
    [id, tenantId, userFk, title, type, JSON.stringify(config), thumbnail]
  );
  return res.rows[0];
}

export async function deleteChartFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return false;
  const res = await p.query('DELETE FROM charts WHERE id = $1 AND "tenantId" = $2 RETURNING id;', [id, tenantId]);
  return res.rowCount > 0;
}

// -------------------------------------------------------------
// CONVERSATIONS & MESSAGES QUERIES
// -------------------------------------------------------------
export async function getConversationsFromDb(tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return [];
  const res = await p.query(
    `SELECT c.*, COUNT(m.id)::int as "messageCount"
     FROM conversations c
     LEFT JOIN messages m ON c.id = m."conversationId"
     WHERE c."tenantId" = $1
     GROUP BY c.id
     ORDER BY c."createdAt" DESC;`,
    [tenantId]
  );
  return res.rows.map((c) => ({
    id: c.id,
    title: c.title,
    agentId: c.agentId,
    createdAt: c.createdAt,
    messageCount: c.messageCount || 0,
    _executionMode: "LIVE",
  }));
}

export async function getConversationMessagesFromDb(convId, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(convId) || !isValidUuid(tenantId)) return { id: convId, messages: [] };
  const convRes = await p.query(
    'SELECT * FROM conversations WHERE id = $1 AND "tenantId" = $2 LIMIT 1;',
    [convId, tenantId]
  );
  if (!convRes.rows.length) return { id: convId, messages: [] };
  const conv = convRes.rows[0];

  const msgRes = await p.query(
    'SELECT * FROM messages WHERE "conversationId" = $1 AND "tenantId" = $2 ORDER BY "createdAt" ASC;',
    [convId, tenantId]
  );
  return {
    id: conv.id,
    title: conv.title,
    agentId: conv.agentId,
    messages: msgRes.rows.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      sources: m.sources || [],
      metadata: m.metadata || {},
      createdAt: m.createdAt,
    })),
    _executionMode: "LIVE",
  };
}

export async function createConversationInDb(tenantId, userId, { id, title, agentId }) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return null;
  const convId = id && isValidUuid(id) ? id : crypto.randomUUID();
  const userFk = isValidUuid(userId) ? userId : null;
  const res = await p.query(
    `INSERT INTO conversations (id, "tenantId", "userId", title, "agentId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, "updatedAt" = NOW()
     RETURNING *;`,
    [convId, tenantId, userFk, title || "New Conversation", agentId || "supply-chain-agent"]
  );
  return res.rows[0];
}

export async function addMessageToDb(firstArg, secondArg, thirdArg) {
  let tenantId, conversationId, data;
  if (thirdArg && typeof thirdArg === "object") {
    tenantId = firstArg;
    conversationId = secondArg;
    data = thirdArg;
  } else {
    conversationId = firstArg;
    data = secondArg || {};
    tenantId = data.tenantId;
  }
  const p = getNeonPool();
  if (!p || !isValidUuid(conversationId)) return null;

  if (!tenantId || !isValidUuid(tenantId)) {
    try {
      const cRes = await p.query('SELECT "tenantId" FROM conversations WHERE id = $1 LIMIT 1;', [conversationId]);
      if (cRes.rows[0]) tenantId = cRes.rows[0].tenantId;
    } catch {}
  }
  if (!tenantId || !isValidUuid(tenantId)) return null;

  const msgId = crypto.randomUUID();
  const res = await p.query(
    `INSERT INTO messages (id, "tenantId", "conversationId", sender, content, sources, metadata, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *;`,
    [
      msgId,
      tenantId,
      conversationId,
      data.sender || "USER",
      data.content || "",
      JSON.stringify(data.sources || []),
      JSON.stringify(data.metadata || {}),
    ]
  );
  return res.rows[0];
}

export async function deleteConversationFromDb(convId, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(convId) || !isValidUuid(tenantId)) return false;
  await p.query('DELETE FROM messages WHERE "conversationId" = $1 AND "tenantId" = $2;', [convId, tenantId]);
  const res = await p.query('DELETE FROM conversations WHERE id = $1 AND "tenantId" = $2 RETURNING id;', [convId, tenantId]);
  return res.rowCount > 0;
}

// -------------------------------------------------------------
// PENDING ACTIONS QUERIES (HITL)
// -------------------------------------------------------------
export async function createPendingActionInDb(tenantId, userId, action) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return null;
  const actionId = action.id && isValidUuid(action.id) ? action.id : crypto.randomUUID();
  const userFk = isValidUuid(userId) ? userId : null;
  const res = await p.query(
    `INSERT INTO pending_actions (id, "tenantId", "userId", "actionType", "targetEntity", params, summary, status, "expiresAt", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING *;`,
    [
      actionId,
      tenantId,
      userFk,
      action.actionType || "RESTOCK_PRODUCT",
      JSON.stringify(action.targetEntity || {}),
      JSON.stringify(action.payload || {}),
      action.summary || action.title || "Pending HITL Action",
      "PENDING_CONFIRMATION",
      action.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    ]
  );
  return {
    ...action,
    id: actionId,
    status: "PENDING_CONFIRMATION",
    createdAt: res.rows[0].createdAt,
    executionMode: "LIVE",
  };
}

export async function getPendingActionsFromDb(tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(tenantId)) return [];
  try {
    const res = await p.query(
      'SELECT * FROM pending_actions WHERE "tenantId" = $1 AND status IN (\'PENDING_CONFIRMATION\', \'PENDING\') ORDER BY "createdAt" DESC LIMIT 10;',
      [tenantId]
    );
    return res.rows.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      summary: row.summary,
      status: row.status,
      payload: row.params || {},
      targetEntity: row.targetEntity || {},
      createdAt: row.createdAt,
      executionMode: "LIVE",
    }));
  } catch (err) {
    console.warn("Neon getPendingActionsFromDb error:", err.message);
    return [];
  }
}

export async function getPendingActionByIdFromDb(id, tenantId) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return null;
  const res = await p.query(
    'SELECT * FROM pending_actions WHERE id = $1 AND "tenantId" = $2 LIMIT 1;',
    [id, tenantId]
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    actionType: row.actionType,
    summary: row.summary,
    status: row.status,
    payload: row.params || {},
    targetEntity: row.targetEntity || {},
    executionResult: row.executionResult,
    createdAt: row.createdAt,
    executedAt: row.executedAt,
    executionMode: "LIVE",
  };
}

export async function updatePendingActionInDb(id, tenantId, status, executionResult) {
  const p = getNeonPool();
  if (!p || !isValidUuid(id) || !isValidUuid(tenantId)) return null;
  const res = await p.query(
    `UPDATE pending_actions
     SET status = $1, "executedAt" = NOW(), "executionResult" = $2, "updatedAt" = NOW()
     WHERE id = $3 AND "tenantId" = $4
     RETURNING *;`,
    [status, JSON.stringify(executionResult || {}), id, tenantId]
  );
  return res.rows[0];
}
