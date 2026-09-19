const BASE_URL = "http://localhost:3000/api/v1";

async function post(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function get(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function put(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function del(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING FULL E2E VALIDATION SUITE");
  console.log("==================================================");

  // ----------------------------------------------------
  // TEST 1: DEMO MODE
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Demo Mode Activation & Sandbox Isolation ---");
  const demoLogin = await post("/auth/demo", {});
  assert(demoLogin.ok, "Demo login successful");
  assert(demoLogin.data.data.isDemo === true, "isDemo flag is true");
  const demoToken = demoLogin.data.data.token;

  const demoInventory = await get("/inventory", demoToken);
  assert(demoInventory.ok, "Demo inventory fetch returned 200");
  const demoProducts = demoInventory.data.data;
  assert(Array.isArray(demoProducts) && demoProducts.length > 0, `Demo inventory contains ${demoProducts.length} items`);

  // Create an item in demo
  const demoCreated = await post(
    "/inventory",
    {
      name: "Sandbox Demo Only Item",
      sku: "DEMO-SANDBOX-999",
      category: "Electronics",
      unitPrice: 49.99,
      quantity: 10,
      reorderPoint: 5,
    },
    demoToken
  );
  assert(demoCreated.ok, "Demo item creation successful");

  // ----------------------------------------------------
  // TEST 2: REAL USER A SIGNUP (NEON PERSISTENCE)
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Real User A Signup in Neon PostgreSQL ---");
  const timestamp = Date.now();
  const userAEmail = `live_user_a_${timestamp}@apexlogistics.com`;
  const userASignup = await post("/auth/signup", {
    name: "Alice Vance",
    email: userAEmail,
    password: "SecurePassword123!",
    organizationName: "Apex Logistics Global",
  });
  assert(userASignup.ok, "User A signup returned 201/200");
  assert(userASignup.data.data.isDemo === false, "User A isDemo is false");
  const tokenA = userASignup.data.data.token;
  const tenantAId = userASignup.data.data.user.tenantId;
  console.log(`User A Tenant ID: ${tenantAId}`);

  // ----------------------------------------------------
  // TEST 3: REAL USER A INVENTORY (EMPTY INITIALLY, CREATION, RETRIEVAL)
  // ----------------------------------------------------
  console.log("\n--- TEST 3: Real User A Inventory CRUD in Neon ---");
  const userAInvInitial = await get("/inventory", tokenA);
  assert(userAInvInitial.ok, "User A initial inventory fetch returned 200");
  assert(
    userAInvInitial.data.data.length === 0,
    "User A initial inventory is 0 (Demo items NOT leaked to Real User)"
  );

  // User A creates product in Neon
  const createProductA = await post(
    "/inventory",
    {
      name: "Industrial IoT Gateway Pro",
      sku: `SKU-IOT-${timestamp}`,
      category: "Hardware",
      unitPrice: 299.5,
      quantity: 50,
      reorderPoint: 15,
      description: "Enterprise grade sensor gateway",
    },
    tokenA
  );
  assert(createProductA.ok, "Product created in Neon for User A");
  const productA = createProductA.data.data;
  assert(productA.id != null, `Created product ID: ${productA.id}`);
  assert(productA.quantity === 50, "Created product quantity is 50");

  // Fetch product by ID
  const getProductA = await get(`/inventory/${productA.id}`, tokenA);
  assert(getProductA.ok, "Fetched created product by ID");
  assert(getProductA.data.data.sku === `SKU-IOT-${timestamp}`, "SKU matches");

  // Adjust stock (RESTOCK / IN)
  const adjustStock = await post(
    `/inventory/${productA.id}/stock`,
    {
      changeType: "IN",
      quantityDelta: 25,
      reason: "Incoming pallet delivery",
    },
    tokenA
  );
  assert(adjustStock.ok, "Stock adjusted (+25 units)");
  assert(
    (adjustStock.data.data.product?.quantity ?? adjustStock.data.data.quantity) === 75,
    "Updated quantity in Neon is 75"
  );

  // Verify Stock History in Neon
  const stockHistory = await get(`/inventory/${productA.id}/history`, tokenA);
  assert(stockHistory.ok, "Stock history fetched from Neon");
  assert(
    Array.isArray(stockHistory.data.data) && stockHistory.data.data.length > 0,
    "Stock history records exist in Neon"
  );

  // Update Product metadata
  const updateProduct = await put(
    `/inventory/${productA.id}`,
    {
      name: "Industrial IoT Gateway Pro v2",
      category: "Hardware",
      unitPrice: 319.99,
      reorderPoint: 20,
    },
    tokenA
  );
  assert(updateProduct.ok, "Product updated in Neon");
  assert(updateProduct.data.data.name === "Industrial IoT Gateway Pro v2", "Updated name verified");

  // ----------------------------------------------------
  // TEST 4: REAL USER A CRM LEADS & TASKS IN NEON
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Real User A CRM Leads & Tasks in Neon ---");
  const createLead = await post(
    "/crm/leads",
    {
      title: "Supply Chain Overhaul Deal",
      company_name: "MegaCorp Industries",
      contact_name: "Robert Smith",
      contact_email: "rsmith@megacorp.com",
      value: 120000,
      stage: "New",
      priority: "HIGH",
    },
    tokenA
  );
  assert(createLead.ok, "Lead created in Neon");
  const leadA = createLead.data.data;

  // Move Lead Stage
  const updateLead = await put(
    `/crm/leads/${leadA.id}/stage`,
    { stage: "Qualified" },
    tokenA
  );
  assert(updateLead.ok, "Lead stage updated to Qualified in Neon");

  // Create Task
  const createTask = await post(
    "/crm/tasks",
    {
      title: "Deliver IoT gateway proposal",
      priority: "HIGH",
      status: "PENDING",
      due_date: "2026-10-01",
    },
    tokenA
  );
  assert(createTask.ok, "Task created in Neon");
  const taskA = createTask.data.data;

  // Update Task Status
  const updateTask = await put(
    `/crm/tasks/${taskA.id}`,
    { status: "COMPLETED" },
    tokenA
  );
  assert(updateTask.ok, "Task status updated to COMPLETED in Neon");

  // ----------------------------------------------------
  // TEST 5: REAL USER A CHARTS IN NEON
  // ----------------------------------------------------
  console.log("\n--- TEST 5: Real User A Charts in Neon ---");
  const createChart = await post(
    "/charts",
    {
      title: "Q4 Warehouse Throughput",
      type: "bar",
      config: {
        dataSource: "inventory_category",
        data: [{ name: "Hardware", value: 75 }],
      },
    },
    tokenA
  );
  assert(createChart.ok, "Custom chart created in Neon");
  const chartA = createChart.data.data;

  const getCharts = await get("/charts", tokenA);
  assert(getCharts.ok, "Charts fetched from Neon");
  assert(
    getCharts.data.data.some((c) => c.id === chartA.id),
    "Created chart exists in Neon list"
  );

  // ----------------------------------------------------
  // TEST 6: AI ASSISTANT CHAT & HITL ACTION MUTATION IN NEON
  // ----------------------------------------------------
  console.log("\n--- TEST 6: AI Assistant Chat & Human-In-The-Loop Execution ---");
  // Query stock via AI
  const aiQuery = await post(
    "/agents/supply-chain-agent/chat",
    {
      message: "What is our current stock and inventory status?",
    },
    tokenA
  );
  assert(aiQuery.ok, "AI Agent responded to stock query");
  console.log("AI Query Response:", JSON.stringify(aiQuery.data));
  assert(
    aiQuery.data.data.answer.includes("Industrial IoT Gateway Pro v2") ||
      aiQuery.data.data.answer.includes("Total Inventory SKUs"),
    "AI read real user data from Neon!"
  );

  // Request restock via AI (Should trigger HITL pending action)
  const aiRestock = await post(
    "/agents/supply-chain-agent/chat",
    {
      message: "Restock Industrial IoT Gateway Pro v2 by 30 units",
    },
    tokenA
  );
  assert(aiRestock.ok, "AI Restock request completed");
  assert(aiRestock.data.data.requiresConfirmation === true, "HITL Confirmation flagged by AI");
  const pendingAction = aiRestock.data.data.pendingAction;
  assert(pendingAction != null, "Pending action card returned");
  console.log(`Pending Action ID: ${pendingAction.id}, Type: ${pendingAction.actionType}`);

  // Approve the pending action via HITL approval endpoint
  const approveAction = await post(
    `/agents/actions/${pendingAction.id}/approve`,
    {},
    tokenA
  );
  assert(approveAction.ok, "HITL action approved and executed");

  // Verify stock was updated in Neon from 75 + 30 = 105!
  const getProductAfterHITL = await get(`/inventory/${productA.id}`, tokenA);
  assert(
    getProductAfterHITL.data.data.quantity === 105,
    `Stock in Neon after HITL approval is 105 (was 75, +30). Verified!`
  );

  // ----------------------------------------------------
  // TEST 7: REAL USER B SIGNUP & MULTI-TENANT ISOLATION
  // ----------------------------------------------------
  console.log("\n--- TEST 7: Multi-Tenant Data Isolation (User A vs User B) ---");
  const userBEmail = `live_user_b_${timestamp}@zenithfreight.com`;
  const userBSignup = await post("/auth/signup", {
    name: "Bob Stone",
    email: userBEmail,
    password: "SecurePassword123!",
    organizationName: "Zenith Freight Systems",
  });
  assert(userBSignup.ok, "User B signed up successfully");
  const tokenB = userBSignup.data.data.token;
  const tenantBId = userBSignup.data.data.user.tenantId;
  assert(tenantBId !== tenantAId, "Tenant IDs are completely distinct");

  // User B queries inventory
  const userBInventory = await get("/inventory", tokenB);
  assert(userBInventory.ok, "User B inventory query successful");
  assert(
    userBInventory.data.data.length === 0,
    "User B sees 0 products (User A's 105 IoT Gateways are NOT accessible to User B!)"
  );

  // User B queries CRM leads
  const userBLeads = await get("/crm/leads", tokenB);
  assert(userBLeads.ok, "User B leads query successful");
  assert(
    userBLeads.data.data.length === 0,
    "User B sees 0 leads (User A's MegaCorp deal is NOT accessible to User B!)"
  );

  // User B queries Charts
  const userBCharts = await get("/charts", tokenB);
  assert(userBCharts.ok, "User B charts query successful");
  assert(
    userBCharts.data.data.length === 0,
    "User B sees 0 custom charts (User A's chart is NOT accessible to User B!)"
  );

  // ----------------------------------------------------
  // TEST 8: DEMO RESET DOES NOT AFFECT NEON USERS
  // ----------------------------------------------------
  console.log("\n--- TEST 8: Demo Reset Does Not Mutate Live Neon Data ---");
  const demoReset = await post("/demo/reset", {}, demoToken);
  assert(demoReset.ok, "Demo reset executed successfully");

  // Check User A's inventory again
  const verifyUserAAfterReset = await get(`/inventory/${productA.id}`, tokenA);
  assert(
    verifyUserAAfterReset.ok && verifyUserAAfterReset.data.data.quantity === 105,
    "User A's product still has 105 units in Neon! Demo reset did not touch Live data!"
  );

  console.log("\n==================================================");
  console.log("🎉 ALL E2E INTEGRATION & ISOLATION TESTS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
