/**
 * Script to test AI Assistant simple responses and Human-In-The-Loop operations:
 * - Simple direct answers to questions
 * - Low stock inquiry does NOT trigger restock or pending action
 * - Restock command requires user-specified product and quantity
 * - Renew stock with confirmation
 * - Edit items with confirmation
 * - Delete items with confirmation
 * - No resources or citations in responses
 */

const API_BASE = "http://localhost:3000/api/v1";

async function post(endpoint, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function run() {
  console.log("\n--- Testing Demo Mode AI Assistant Actions & Simple Responses ---");

  // Login as demo
  const login = await post("/auth/demo", {});
  assert(login.ok, "Demo login successful");
  const token = login.data.data.token;

  // 1. Low stock inquiry (Must NOT trigger restock or pending action!)
  console.log("\n1. Asking: which products are on low stock...");
  const qLowStock = await post("/agents/supply-chain-agent/chat", {
    message: "which products are on low stock"
  }, token);
  assert(qLowStock.ok, "Low stock query received response");
  assert(qLowStock.data.data.requiresConfirmation === false, "Low stock inquiry must NOT require confirmation");
  assert(qLowStock.data.data.pendingAction == null, "Low stock inquiry must NOT create any pending restock action");
  assert(!qLowStock.data.data.sources || qLowStock.data.data.sources.length === 0, "No resources or sources attached");
  console.log("AI Answer (Low stock):\n", qLowStock.data.data.answer);

  // 1b. Restock command WITHOUT quantity (Must ask for quantity, NOT stage action!)
  console.log("\n1b. Command: restock Brushless Motor (without quantity)...");
  const qNoQty = await post("/agents/supply-chain-agent/chat", {
    message: "restock Brushless Motor"
  }, token);
  assert(qNoQty.ok, "Restock without quantity received response");
  assert(qNoQty.data.data.requiresConfirmation === false, "Must not stage restock until quantity is specified");
  assert(qNoQty.data.data.pendingAction == null, "No pending action created without quantity");
  assert(qNoQty.data.data.answer.toLowerCase().includes("how many"), "AI asks user how many units to restock");
  console.log("AI Answer (No quantity):\n", qNoQty.data.data.answer);

  // 2. Renew stock operation with user-specified quantity
  console.log("\n2. Asking to renew stock with user-specified items (20 units)...");
  const q2 = await post("/agents/supply-chain-agent/chat", {
    message: "renew the stock of Brushless Motor by 20 units"
  }, token);
  assert(q2.ok, "Renew stock request processed");
  assert(q2.data.data.requiresConfirmation === true, "Confirmation flagged for renew stock");
  assert(q2.data.data.pendingAction != null, "Pending action created");
  assert(q2.data.data.pendingAction.actionType === "RESTOCK_PRODUCT", "Action type is RESTOCK_PRODUCT");
  assert(q2.data.data.pendingAction.payload.quantityDelta === 20, "Quantity matches exactly the 20 units requested by user");
  assert(!q2.data.data.sources || q2.data.data.sources.length === 0, "No resources or sources attached");
  console.log("AI Answer:\n", q2.data.data.answer);

  // Approve renew stock
  const approveRenew = await post(`/agents/actions/${q2.data.data.pendingAction.id}/approve`, {}, token);
  assert(approveRenew.ok, "Renew stock action successfully approved and executed");

  // 3. Edit operation
  console.log("\n3. Asking to edit an item...");
  const q3 = await post("/agents/supply-chain-agent/chat", {
    message: "edit the price of Brushless Motor to $299"
  }, token);
  assert(q3.ok, "Edit request processed");
  assert(q3.data.data.requiresConfirmation === true, "Confirmation flagged for edit");
  assert(q3.data.data.pendingAction != null, "Pending action created for edit");
  assert(q3.data.data.pendingAction.actionType === "EDIT_PRODUCT", "Action type is EDIT_PRODUCT");
  console.log("AI Answer:\n", q3.data.data.answer);

  // Approve edit
  const approveEdit = await post(`/agents/actions/${q3.data.data.pendingAction.id}/approve`, {}, token);
  assert(approveEdit.ok, "Edit product action successfully approved and executed");

  // 4. Delete operation
  console.log("\n4. Asking to delete an item...");
  const q4 = await post("/agents/supply-chain-agent/chat", {
    message: "delete product Optoelectronic Sensor"
  }, token);
  assert(q4.ok, "Delete request processed");
  assert(q4.data.data.requiresConfirmation === true, "Confirmation flagged for delete");
  assert(q4.data.data.pendingAction != null, "Pending action created for delete");
  assert(q4.data.data.pendingAction.actionType === "DELETE_PRODUCT", "Action type is DELETE_PRODUCT");
  console.log("AI Answer:\n", q4.data.data.answer);

  // Approve delete
  const approveDelete = await post(`/agents/actions/${q4.data.data.pendingAction.id}/approve`, {}, token);
  assert(approveDelete.ok, "Delete product action successfully approved and executed");

  // 5. General question: Simple direct answer
  console.log("\n5. Asking a general question...");
  const q5 = await post("/agents/supply-chain-agent/chat", {
    message: "How can I improve warehouse picking efficiency?"
  }, token);
  assert(q5.ok, "General question answered");
  assert(q5.data.data.requiresConfirmation === false, "General question requires no confirmation");
  assert(!q5.data.data.sources || q5.data.data.sources.length === 0, "No resources or sources attached");
  console.log("AI Answer:\n", q5.data.data.answer);

  console.log("\n🎉 ALL USER INTENT & HITL CHECKS PASSED!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
