import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  getAuthenticatedContext,
  signToken,
  storeAdapter,
  getDemoDb,
  getLiveDb,
  saveLiveDb,
  resetDemoDb,
} from "@/lib/server/store";
import * as neonDb from "@/lib/server/neonDb";
import { executeAgentChat } from "@/lib/server/agent";

function jsonSuccess(data, message = "Success", status = 200) {
  return NextResponse.json(
    { success: true, message, data },
    { status }
  );
}

function jsonError(message = "An error occurred", status = 400, code = "BAD_REQUEST") {
  return NextResponse.json(
    { success: false, error: { message, code }, message },
    { status }
  );
}

// -------------------------------------------------------------
// GET Handler
// -------------------------------------------------------------
export async function GET(req, { params }) {
  const slug = params?.slug || [];
  const url = new URL(req.url);
  const context = getAuthenticatedContext(req);

  try {
    // 1. Auth Me
    if (slug[0] === "auth" && slug[1] === "me") {
      if (!context.isAuthenticated) {
        return jsonError("Not authenticated", 401, "UNAUTHORIZED");
      }
      return jsonSuccess({
        user: context.user,
        isDemo: context.isDemo,
        mode: context.mode,
      });
    }

    // Require authentication for all subsequent endpoints
    if (!context.isAuthenticated) {
      return jsonError("Authentication required. Please log in.", 401, "UNAUTHORIZED");
    }

    // 2. Inventory Routes
    if (slug[0] === "inventory") {
      // GET /api/v1/inventory/:id/history
      if (slug[1] && slug[2] === "history") {
        const history = await storeAdapter.getStockHistory(context, slug[1]);
        return jsonSuccess(history);
      }
      // GET /api/v1/inventory/:id
      if (slug[1] && !slug[2]) {
        const item = await storeAdapter.getProductById(context, slug[1]);
        if (!item) return jsonError("Product not found", 404, "NOT_FOUND");
        return jsonSuccess(item);
      }
      // GET /api/v1/inventory
      const category = url.searchParams.get("category") || "ALL";
      const status = url.searchParams.get("status") || "ALL";
      const search = url.searchParams.get("search") || "";
      const products = await storeAdapter.getProducts(context, { category, status, search });
      return jsonSuccess(products);
    }

    // 3. CRM Routes
    if (slug[0] === "crm") {
      if (slug[1] === "leads") {
        const leads = await storeAdapter.getLeads(context);
        return jsonSuccess(leads);
      }
      if (slug[1] === "tasks") {
        const tasks = await storeAdapter.getTasks(context);
        return jsonSuccess(tasks);
      }
      if (slug[1] === "customers") {
        const customers = storeAdapter.getCustomers(context);
        return jsonSuccess(customers);
      }
    }

    // 4. Dashboard Stats
    if (slug[0] === "dashboard" && slug[1] === "stats") {
      const stats = await storeAdapter.getDashboardStats(context);
      return jsonSuccess(stats);
    }

    // 5. Charts
    if (slug[0] === "charts") {
      const charts = await storeAdapter.getCharts(context);
      return jsonSuccess(charts);
    }

    // 6. Conversations & Messages
    if (slug[0] === "conversations") {
      if (slug[1] && slug[2] === "messages") {
        const data = storeAdapter.getConversationMessages(context, slug[1]);
        return jsonSuccess(data);
      }
      const convs = storeAdapter.getConversations(context);
      return jsonSuccess(convs);
    }

    // 7. Notifications
    if (slug[0] === "notifications") {
      const notifs = [
        {
          id: "notif-1",
          title: "System Synchronization",
          message: `Operational in ${context.mode} mode. Warehouse telemetry active.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];
      return jsonSuccess(notifs);
    }

    // 8. Agents list
    if (slug[0] === "agents") {
      return jsonSuccess([
        { id: "supply-chain-agent", name: "Supply Chain Master", status: "ACTIVE" },
        { id: "inventory-agent", name: "Inventory Agent", status: "ACTIVE" },
        { id: "crm-agent", name: "CRM Agent", status: "ACTIVE" },
      ]);
    }

    return jsonError(`Route GET /api/v1/${slug.join("/")} not found`, 404, "NOT_FOUND");
  } catch (err) {
    console.error(`Error in GET /api/v1/${slug.join("/")}:`, err);
    return jsonError(err.message, 500, "SERVER_ERROR");
  }
}

// -------------------------------------------------------------
// POST Handler
// -------------------------------------------------------------
export async function POST(req, { params }) {
  const slug = params?.slug || [];
  let body = {};
  try {
    body = await req.json();
  } catch (e) {}

  const context = getAuthenticatedContext(req);

  try {
    // 1. Auth: Demo Login
    if (slug[0] === "auth" && slug[1] === "demo") {
      const demoUser = {
        userId: "demo-user-alex",
        email: "demo@smartsupply.ai",
        name: "Alex Reynolds",
        role: "ADMIN",
        isDemo: true,
        tenantId: "demo-tenant-id",
        tenantName: "Acme Logistics Global (Demo)",
      };

      const token = signToken(demoUser);

      return jsonSuccess({
        token,
        isDemo: true,
        user: {
          id: demoUser.userId,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          tenantId: demoUser.tenantId,
          tenantName: demoUser.tenantName,
        },
      }, "Demo mode activated. Sandboxed state ready.");
    }

    // 2. Auth: Live Login
    if (slug[0] === "auth" && slug[1] === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return jsonError("Email and password are required", 400);
      }

      let user = null;
      let tenant = null;

      // Check Neon Cloud Database first
      if (process.env.DATABASE_URL) {
        try {
          const dbUser = await neonDb.findUserByEmail(email);
          if (dbUser) {
            const valid = await bcrypt.compare(password, dbUser.passwordHash);
            if (valid) {
              user = dbUser;
              tenant = await neonDb.findTenantById(user.tenantId);
            } else {
              return jsonError("Invalid email or password", 401, "UNAUTHORIZED");
            }
          }
        } catch (dbErr) {
          console.error("Neon DB auth error:", dbErr.message);
        }
      }

      // Fallback to local store if not found in Neon
      if (!user) {
        const live = getLiveDb();
        const localUser = live.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

        if (!localUser) {
          return jsonError("Invalid email or password", 401, "UNAUTHORIZED");
        }

        const valid = await bcrypt.compare(password, localUser.passwordHash);
        if (!valid) {
          return jsonError("Invalid email or password", 401, "UNAUTHORIZED");
        }

        user = localUser;
        tenant = live.tenants.find((t) => t.id === user.tenantId) || {
          id: user.tenantId,
          name: "Acme Corp",
        };
      }

      const tenantName = tenant?.name || "Enterprise Logistics";
      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName,
        isDemo: false,
      });

      return jsonSuccess({
        token,
        isDemo: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          tenantName,
        },
      }, "Login successful.");
    }

    // 3. Auth: Signup
    if (slug[0] === "auth" && slug[1] === "signup") {
      const { email, password, name, organizationName } = body;
      if (!email || !password || !name) {
        return jsonError("Name, email, and password are required", 400);
      }

      // Create in Neon Cloud Database if configured
      if (process.env.DATABASE_URL) {
        try {
          const existingUser = await neonDb.findUserByEmail(email);
          if (existingUser) {
            return jsonError("Account with this email already exists", 409, "CONFLICT");
          }

          const tenant = await neonDb.createTenantInDb({
            name: organizationName || `${name}'s Organization`,
          });

          const passwordHash = await bcrypt.hash(password, 10);
          const newUser = await neonDb.createUserInDb({
            tenantId: tenant.id,
            email,
            passwordHash,
            name,
            role: "ADMIN",
          });

          const token = signToken({
            userId: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            tenantId: newUser.tenantId,
            tenantName: tenant.name,
            isDemo: false,
          });

          return jsonSuccess({
            token,
            isDemo: false,
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              tenantId: newUser.tenantId,
              tenantName: tenant.name,
            },
          }, "Account created successfully.", 201);
        } catch (dbErr) {
          console.error("Neon signup error, falling back to local:", dbErr.message);
        }
      }

      const live = getLiveDb();
      const existing = live.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return jsonError("Account with this email already exists", 409, "CONFLICT");
      }

      const tenantId = `tenant-${Date.now()}`;
      const newTenant = {
        id: tenantId,
        name: organizationName || `${name}'s Organization`,
        slug: (organizationName || name).toLowerCase().replace(/[^a-z0-9]/g, "-"),
        isActive: true,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = {
        id: `user-${Date.now()}`,
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "ADMIN",
        tenantId,
        isActive: true,
        isDemo: false,
        createdAt: new Date().toISOString(),
      };

      live.tenants.push(newTenant);
      live.users.push(newUser);
      saveLiveDb();

      const token = signToken({
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        tenantId: newUser.tenantId,
        tenantName: newTenant.name,
        isDemo: false,
      });

      return jsonSuccess({
        token,
        isDemo: false,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          tenantId: newUser.tenantId,
          tenantName: newTenant.name,
        },
      }, "Account created successfully.", 201);
    }

    // 4. Demo Reset
    if (slug[0] === "demo" && slug[1] === "reset") {
      resetDemoDb();
      return jsonSuccess({ reset: true }, "Demo sandbox data successfully restored to factory state.");
    }

    // Require authentication for all mutating business endpoints
    if (!context.isAuthenticated) {
      return jsonError("Authentication required.", 401, "UNAUTHORIZED");
    }

    // 5. Inventory: Create product
    if (slug[0] === "inventory" && !slug[1]) {
      const created = await storeAdapter.createProduct(context, body);
      return jsonSuccess(created, "Product created successfully", 201);
    }

    // 6. Inventory: Adjust Stock (Restock / Deduct)
    if (slug[0] === "inventory" && slug[1] && slug[2] === "stock") {
      const result = await storeAdapter.adjustStock(context, slug[1], {
        changeType: body.changeType || body.type,
        quantityDelta: body.quantityDelta || body.quantity || body.delta,
        reason: body.reason,
      });
      return jsonSuccess(result, "Inventory stock level updated successfully");
    }

    // 7. CRM: Create Lead
    if (slug[0] === "crm" && slug[1] === "leads") {
      const created = await storeAdapter.createLead(context, body);
      return jsonSuccess(created, "Lead created successfully", 201);
    }

    // 8. CRM: Create Task
    if (slug[0] === "crm" && slug[1] === "tasks") {
      const created = await storeAdapter.createTask(context, body);
      return jsonSuccess(created, "Task created successfully", 201);
    }

    // 9. Charts: Create Chart
    if (slug[0] === "charts" && !slug[1]) {
      const created = await storeAdapter.createChart(context, body);
      return jsonSuccess(created, "Chart created successfully", 201);
    }

    // 10. AI Agent: Chat
    if (slug[0] === "agents" && slug[2] === "chat") {
      const agentId = slug[1];
      const result = await executeAgentChat(context, {
        agentId,
        message: body.message,
        conversationId: body.conversationId,
      });
      return jsonSuccess(result);
    }

    // 11. AI Agent: Approve HITL Action
    if (slug[0] === "agents" && slug[1] === "actions" && slug[3] === "approve") {
      const actionId = slug[2];
      const result = storeAdapter.approvePendingAction(context, actionId);
      return jsonSuccess(result, "Action successfully approved and executed.");
    }

    // 12. AI Agent: Reject HITL Action
    if (slug[0] === "agents" && slug[1] === "actions" && slug[3] === "reject") {
      const actionId = slug[2];
      const result = storeAdapter.rejectPendingAction(context, actionId);
      return jsonSuccess(result, "Action rejected.");
    }

    return jsonError(`Route POST /api/v1/${slug.join("/")} not found`, 404, "NOT_FOUND");
  } catch (err) {
    console.error(`Error in POST /api/v1/${slug.join("/")}:`, err);
    return jsonError(err.message, 500, "SERVER_ERROR");
  }
}

// -------------------------------------------------------------
// PUT Handler
// -------------------------------------------------------------
export async function PUT(req, { params }) {
  const slug = params?.slug || [];
  let body = {};
  try {
    body = await req.json();
  } catch (e) {}

  const context = getAuthenticatedContext(req);
  if (!context.isAuthenticated) {
    return jsonError("Authentication required.", 401, "UNAUTHORIZED");
  }

  try {
    // 1. Inventory: Update product
    if (slug[0] === "inventory" && slug[1]) {
      const updated = await storeAdapter.updateProduct(context, slug[1], body);
      return jsonSuccess(updated, "Product updated successfully");
    }

    // 2. CRM: Update lead stage
    if (slug[0] === "crm" && slug[1] === "leads" && slug[3] === "stage") {
      const updated = await storeAdapter.updateLead(context, slug[2], { stage: body.stage });
      return jsonSuccess(updated, "Lead stage updated");
    }

    // 3. CRM: Update lead general
    if (slug[0] === "crm" && slug[1] === "leads" && slug[2]) {
      const updated = await storeAdapter.updateLead(context, slug[2], body);
      return jsonSuccess(updated, "Lead updated successfully");
    }

    // 4. CRM: Update task
    if (slug[0] === "crm" && slug[1] === "tasks" && slug[2]) {
      const updated = await storeAdapter.updateTask(context, slug[2], body);
      return jsonSuccess(updated, "Task updated successfully");
    }

    // 5. Notifications read all
    if (slug[0] === "notifications" && slug[1] === "read-all") {
      return jsonSuccess({ read: true });
    }

    return jsonError(`Route PUT /api/v1/${slug.join("/")} not found`, 404, "NOT_FOUND");
  } catch (err) {
    console.error(`Error in PUT /api/v1/${slug.join("/")}:`, err);
    return jsonError(err.message, 500, "SERVER_ERROR");
  }
}

// -------------------------------------------------------------
// DELETE Handler
// -------------------------------------------------------------
export async function DELETE(req, { params }) {
  const slug = params?.slug || [];
  const context = getAuthenticatedContext(req);
  if (!context.isAuthenticated) {
    return jsonError("Authentication required.", 401, "UNAUTHORIZED");
  }

  try {
    // 1. Inventory: Delete Product
    if (slug[0] === "inventory" && slug[1]) {
      const result = await storeAdapter.deleteProduct(context, slug[1]);
      return jsonSuccess(result, "Product deleted successfully");
    }

    // 2. CRM: Delete Lead
    if (slug[0] === "crm" && slug[1] === "leads" && slug[2]) {
      const result = await storeAdapter.deleteLead(context, slug[2]);
      return jsonSuccess(result, "Lead deleted successfully");
    }

    // 3. CRM: Delete Task
    if (slug[0] === "crm" && slug[1] === "tasks" && slug[2]) {
      const result = await storeAdapter.deleteTask(context, slug[2]);
      return jsonSuccess(result, "Task deleted successfully");
    }

    // 4. Charts: Delete Chart
    if (slug[0] === "charts" && slug[1]) {
      const result = await storeAdapter.deleteChart(context, slug[1]);
      return jsonSuccess(result, "Chart deleted successfully");
    }

    // 5. Conversations: Delete Conversation
    if (slug[0] === "conversations" && slug[1]) {
      const result = storeAdapter.deleteConversation(context, slug[1]);
      return jsonSuccess(result, "Conversation deleted successfully");
    }

    return jsonError(`Route DELETE /api/v1/${slug.join("/")} not found`, 404, "NOT_FOUND");
  } catch (err) {
    console.error(`Error in DELETE /api/v1/${slug.join("/")}:`, err);
    return jsonError(err.message, 500, "SERVER_ERROR");
  }
}

// -------------------------------------------------------------
// OPTIONS Handler for CORS
// -------------------------------------------------------------
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
    },
  });
}
