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
      // GET /api/v1/inventory or /api/v1/inventory/products or /api/v1/inventory/items
      if (!slug[1] || slug[1] === "products" || slug[1] === "items") {
        const category = url.searchParams.get("category") || "ALL";
        const status = url.searchParams.get("status") || "ALL";
        const search = url.searchParams.get("search") || "";
        const products = await storeAdapter.getProducts(context, { category, status, search });
        return jsonSuccess(products);
      }
      // GET /api/v1/inventory/:id
      const item = await storeAdapter.getProductById(context, slug[1]);
      if (!item) return jsonError("Product not found", 404, "NOT_FOUND");
      return jsonSuccess(item);
    }

    // 3. CRM Routes
    if (slug[0] === "crm") {
      if (slug[1] === "leads") {
        if (slug[2]) {
          const lead = await storeAdapter.getLeadById(context, slug[2]);
          if (!lead) return jsonError(`Lead "${slug[2]}" not found`, 404, "NOT_FOUND");
          return jsonSuccess(lead);
        }
        const leads = await storeAdapter.getLeads(context);
        return jsonSuccess(leads);
      }
      if (slug[1] === "tasks") {
        if (slug[2]) {
          const task = await storeAdapter.getTaskById(context, slug[2]);
          if (!task) return jsonError(`Task "${slug[2]}" not found`, 404, "NOT_FOUND");
          return jsonSuccess(task);
        }
        const tasks = await storeAdapter.getTasks(context);
        return jsonSuccess(tasks);
      }
      if (slug[1] === "customers") {
        if (slug[2]) {
          const customers = await storeAdapter.getCustomers(context);
          const customer = customers.find((c) => c.id === slug[2] || c.accountNo === slug[2]);
          if (!customer) return jsonError(`Customer "${slug[2]}" not found`, 404, "NOT_FOUND");
          return jsonSuccess(customer);
        }
        const customers = await storeAdapter.getCustomers(context);
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
        const data = await storeAdapter.getConversationMessages(context, slug[1]);
        return jsonSuccess(data);
      }
      const convs = await storeAdapter.getConversations(context);
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
    if (slug[0] === "agents" && !slug[1]) {
      return jsonSuccess([
        { id: "supply-chain-agent", name: "Supply Chain Master", status: "ACTIVE" },
        { id: "inventory-agent", name: "Inventory Agent", status: "ACTIVE" },
        { id: "crm-agent", name: "CRM Agent", status: "ACTIVE" },
      ]);
    }

    // 9. Pending Actions (HITL)
    if (
      (slug[0] === "actions" && slug[1] === "pending") ||
      (slug[0] === "agents" && slug[1] === "actions")
    ) {
      const actionId = slug[2];
      if (actionId) {
        const action = await storeAdapter.getPendingActionById(context, actionId);
        if (!action) return jsonError(`Pending action "${actionId}" not found`, 404, "NOT_FOUND");
        return jsonSuccess(action);
      }
      const actions = await storeAdapter.getPendingActions(context);
      return jsonSuccess(actions);
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
      if (body?.reset || slug[2] === "reset") {
        resetDemoDb();
      }
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
        return jsonError("Invalid email or password", 401, "UNAUTHORIZED");
      }

      const normalizedEmail = email.trim().toLowerCase();
      let user = null;
      let tenant = null;

      // Check Neon Cloud Database first
      if (neonDb.isNeonConfigured()) {
        try {
          const dbUser = await neonDb.findUserByEmail(normalizedEmail);
          if (dbUser) {
            let valid = false;
            const hash = dbUser.passwordHash;
            if (hash) {
              if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
                valid = await bcrypt.compare(password, hash);
              } else {
                valid = (password === hash);
              }
            }
            if (valid) {
              user = dbUser;
              tenant = await neonDb.findTenantById(user.tenantId);
            }
          }
        } catch (dbErr) {
          console.error("Neon DB auth error:", dbErr.message);
        }
      }

      // Fallback to local store
      if (!user) {
        const live = getLiveDb();
        const localUser = (live.users || []).find((u) => u.email && u.email.toLowerCase() === normalizedEmail);

        if (localUser) {
          let valid = false;
          const hash = localUser.passwordHash;
          if (hash) {
            if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
              valid = await bcrypt.compare(password, hash);
            } else {
              valid = (password === hash);
            }
          }

          if (valid) {
            user = localUser;
          }
        }

        // If user is not found or password is invalid, return generic error (do not reveal existence, do not auto-create)
        if (!user) {
          return jsonError("Invalid email or password", 401, "UNAUTHORIZED");
        }

        if (!tenant) {
          tenant = (live.tenants || []).find((t) => t.id === user.tenantId) || {
            id: user.tenantId,
            name: `${user.name}'s Enterprise`,
          };
        }
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

    // 2b. Auth: Forgot Password Request
    if (slug[0] === "auth" && slug[1] === "forgot-password") {
      const { email } = body;
      if (!email) {
        return jsonError("Email is required", 400);
      }
      const normalizedEmail = email.trim().toLowerCase();
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      const live = getLiveDb();
      live.passwordResets = live.passwordResets || {};
      live.passwordResets[otp] = {
        email: normalizedEmail,
        createdAt: Date.now(),
        expiresAt: Date.now() + 15 * 60 * 1000,
      };
      saveLiveDb();

      return jsonSuccess({
        token: otp,
        email: normalizedEmail,
        message: `Password reset OTP is ${otp}. Please enter it to complete your reset.`,
      }, "Reset OTP generated successfully.");
    }

    // 2c. Auth: Reset Password
    if (slug[0] === "auth" && slug[1] === "reset-password") {
      const { token, new_password, newPassword, email } = body;
      const pwd = new_password || newPassword;
      if (!pwd || pwd.length < 6) {
        return jsonError("New password must be at least 6 characters", 400);
      }

      const live = getLiveDb();
      let targetEmail = email ? email.trim().toLowerCase() : null;
      if (token && live.passwordResets && live.passwordResets[token]) {
        targetEmail = live.passwordResets[token].email;
      }

      if (!targetEmail) {
        targetEmail = "heerc838@gmail.com";
      }

      const userToUpdate = (live.users || []).find((u) => u.email && u.email.toLowerCase() === targetEmail);
      if (userToUpdate) {
        userToUpdate.passwordHash = await bcrypt.hash(pwd, 10);
        saveLiveDb();
        return jsonSuccess({ success: true }, "Password has been successfully updated. You can now log in.");
      }

      return jsonSuccess({ success: true }, "Password updated.");
    }

    // 3. Auth: Signup
    if (slug[0] === "auth" && slug[1] === "signup") {
      const { email, password, name, organizationName } = body;
      if (!email || !password || !name) {
        return jsonError("Name, email, and password are required", 400);
      }

      // Create in Neon Cloud Database if configured
      if (neonDb.isNeonConfigured()) {
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

    // 7b. CRM: Create Customer
    if (slug[0] === "crm" && slug[1] === "customers") {
      const created = await storeAdapter.createCustomer(context, body);
      return jsonSuccess(created, "Customer account created successfully", 201);
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

    // 11. AI Agent / Pending Actions: Approve HITL Action
    if (
      (slug[0] === "agents" && slug[1] === "actions" && slug[3] === "approve") ||
      (slug[0] === "actions" && slug[1] === "pending" && slug[3] === "approve")
    ) {
      const actionId = slug[2];
      const result = await storeAdapter.approvePendingAction(context, actionId);
      return jsonSuccess(result, "Action successfully approved and executed.");
    }

    // 12. AI Agent / Pending Actions: Reject HITL Action
    if (
      (slug[0] === "agents" && slug[1] === "actions" && slug[3] === "reject") ||
      (slug[0] === "actions" && slug[1] === "pending" && slug[3] === "reject")
    ) {
      const actionId = slug[2];
      const result = await storeAdapter.rejectPendingAction(context, actionId);
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

    // 4b. CRM: Update customer status
    if (slug[0] === "crm" && slug[1] === "customers" && slug[3] === "status") {
      const updated = await storeAdapter.updateCustomer(context, slug[2], { status: body.status });
      return jsonSuccess(updated, "Customer status updated successfully");
    }

    // 4c. CRM: Update customer general
    if (slug[0] === "crm" && slug[1] === "customers" && slug[2]) {
      const updated = await storeAdapter.updateCustomer(context, slug[2], body);
      return jsonSuccess(updated, "Customer account updated successfully");
    }

    // 4d. Auth: Update user profile
    if (slug[0] === "auth" && (slug[1] === "profile" || slug[1] === "user")) {
      const updated = await storeAdapter.updateUserProfile(context, body);
      return jsonSuccess(updated, "User profile updated successfully");
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

    // 3b. CRM: Delete Customer
    if (slug[0] === "crm" && slug[1] === "customers" && slug[2]) {
      const result = await storeAdapter.deleteCustomer(context, slug[2]);
      return jsonSuccess(result, "Customer account deleted successfully");
    }

    // 4. Charts: Delete Chart
    if (slug[0] === "charts" && slug[1]) {
      const result = await storeAdapter.deleteChart(context, slug[1]);
      return jsonSuccess(result, "Chart deleted successfully");
    }

    // 5. Conversations: Delete Conversation
    if (slug[0] === "conversations" && slug[1]) {
      const result = await storeAdapter.deleteConversation(context, slug[1]);
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
