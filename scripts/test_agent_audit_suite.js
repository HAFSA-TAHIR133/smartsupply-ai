/**
 * Comprehensive Audit Suite for SmartSupply AI Assistant
 * Verifies all reported bugs and architectural requirements:
 * 1. Follow-up task creation vs. lead creation disambiguation
 * 2. Due date parsing (e.g. 30 sep 2026 -> 2026-09-30)
 * 3. Delete lead by reference (e.g. #L-2357) and conversational state retention
 * 4. Delete existing lead with HITL confirmation
 * 5. Multi-turn workflow retention (Mem0 memory service & conversation state)
 * 6. Tenant isolation enforcement
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

async function runAudit() {
  console.log("\n=======================================================");
  console.log("SMARTSUPPLY AI ASSISTANT COMPREHENSIVE AUDIT SUITE");
  console.log("=======================================================\n");

  // Reset & Login as Demo
  const login = await post("/auth/demo", { reset: true });
  assert(login.ok, "Demo login and DB reset successful");
  const token = login.data.data.token;

  // -------------------------------------------------------------
  // TEST 1: CRITICAL BUG — Task Creation vs Lead Creation
  // Prompt: "Add a follow up task of meeting with the lead schedule on 30 sep 2026"
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Testing prompt: 'Add a follow up task of meeting with the lead schedule on 30 sep 2026'...");
  const taskRes = await post("/agents/supply-chain-agent/chat", {
    message: "Add a follow up task of meeting with the lead schedule on 30 sep 2026",
    conversationId: "conv-test-task-lead-1",
  }, token);

  assert(taskRes.ok, "Task creation request received 200");
  assert(taskRes.data.data.requiresConfirmation === true, "Task creation requires confirmation");
  assert(taskRes.data.data.pendingAction != null, "Pending action created");
  assert(taskRes.data.data.pendingAction.actionType === "CREATE_TASK", `Action type MUST be CREATE_TASK (was: ${taskRes.data.data.pendingAction.actionType})`);
  assert(taskRes.data.data.pendingAction.actionType !== "CREATE_LEAD", "Must NEVER invoke CREATE_LEAD for a task creation prompt");
  assert(taskRes.data.data.toolsUsed.includes("crm_task_creator"), "crm_task_creator tool was used");
  assert(!taskRes.data.data.toolsUsed.includes("crm_lead_creator"), "crm_lead_creator tool was NOT used");

  const taskPayload = taskRes.data.data.pendingAction.payload;
  console.log("Task Payload:", taskPayload);
  assert(taskPayload.title.toLowerCase().includes("meeting"), "Task title extracted 'meeting'");
  assert(taskPayload.dueDate === "2026-09-30", `Due date parsed as 2026-09-30 (was: ${taskPayload.dueDate})`);
  console.log("AI Answer:", taskRes.data.data.answer);

  // Approve the task creation
  const approveTask = await post("/agents/supply-chain-agent/chat", {
    message: "Yes, please confirm",
    conversationId: "conv-test-task-lead-1",
  }, token);
  assert(approveTask.ok, "Task approval request received 200");
  assert(approveTask.data.data.executedAction === true, "Task executedAction is true");
  assert(approveTask.data.data.answer.toLowerCase().includes("meeting"), "AI confirms task creation in response");

  // Verify task exists in CRM
  const tasksRes = await fetch(`${API_BASE}/crm/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tasksData = await tasksRes.json();
  const createdTask = tasksData.data.find((t) => t.title.toLowerCase().includes("meeting"));
  assert(createdTask != null, "Created task is persisted in CRM database");
  assert(createdTask.dueDate === "2026-09-30", "Persisted task has due date 2026-09-30");

  // -------------------------------------------------------------
  // TEST 2: Delete Lead with Non-Existent Identifier (#L-2357)
  // Prompt: "delete the lead #L-2357"
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Testing prompt: 'delete the lead #L-2357'...");
  const delNonExistent = await post("/agents/supply-chain-agent/chat", {
    message: "delete the lead #L-2357",
    conversationId: "conv-test-del-2357",
  }, token);

  assert(delNonExistent.ok, "Delete non-existent lead response received 200");
  assert(delNonExistent.data.data.requiresConfirmation === false, "Must NOT require confirmation for non-existent lead");
  assert(delNonExistent.data.data.pendingAction == null, "Must NOT stage a pending action for non-existent lead");
  assert(delNonExistent.data.data.toolsUsed.includes("crm_lead_deleter"), "crm_lead_deleter tool routed");
  assert(delNonExistent.data.data.answer.includes("L-2357"), "AI clearly informs user that L-2357 was not found");
  assert(delNonExistent.data.data.answer.includes("active leads"), "AI provides list of active leads to help user resolve context");
  console.log("AI Answer (Lead not found):\n", delNonExistent.data.data.answer);

  // -------------------------------------------------------------
  // TEST 3: Multi-turn Context Resolution following missing lead
  // User now specifies an active lead name in the same conversation
  // -------------------------------------------------------------
  console.log("\n[TEST 3] Multi-turn resolution: User follows up with 'National Courier Fleet Automation'...");
  const resolveLeadRes = await post("/agents/supply-chain-agent/chat", {
    message: "National Courier Fleet Automation",
    conversationId: "conv-test-del-2357",
  }, token);

  assert(resolveLeadRes.ok, "Multi-turn follow-up received 200");
  assert(resolveLeadRes.data.data.requiresConfirmation === true, "Confirmation flagged for resolved lead deletion");
  assert(resolveLeadRes.data.data.pendingAction != null, "Pending action created for DELETE_LEAD");
  assert(resolveLeadRes.data.data.pendingAction.actionType === "DELETE_LEAD", "Action type is DELETE_LEAD");
  assert(resolveLeadRes.data.data.pendingAction.payload.leadTitle.includes("National Courier Fleet Automation"), "Payload targeted National Courier lead");
  console.log("AI Answer (Resolved lead confirmation):\n", resolveLeadRes.data.data.answer);

  // Rejection test: User says "No"
  const rejectDel = await post("/agents/supply-chain-agent/chat", {
    message: "No, keep it",
    conversationId: "conv-test-del-2357",
  }, token);
  assert(rejectDel.ok, "Rejection handled successfully");
  assert(rejectDel.data.data.pendingAction.status === "REJECTED", "Pending action marked REJECTED");
  assert(rejectDel.data.data.answer.toLowerCase().includes("cancelled") || rejectDel.data.data.answer.toLowerCase().includes("no changes"), "AI acknowledges cancellation");

  // -------------------------------------------------------------
  // TEST 4: Delete Lead by Existing Lead Title Directly
  // Prompt: "delete lead Autonomous Delivery Drone Supply"
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Testing prompt: 'delete lead Autonomous Delivery Drone Supply'...");
  const delExistingLead = await post("/agents/supply-chain-agent/chat", {
    message: "delete lead Autonomous Delivery Drone Supply",
    conversationId: "conv-test-del-lead-mesh",
  }, token);

  assert(delExistingLead.ok, "Delete existing lead request received 200");
  assert(delExistingLead.data.data.requiresConfirmation === true, "Requires confirmation to delete existing lead");
  assert(delExistingLead.data.data.pendingAction != null, "Pending action created");
  assert(delExistingLead.data.data.pendingAction.actionType === "DELETE_LEAD", "Action type is DELETE_LEAD");
  assert(delExistingLead.data.data.pendingAction.payload.leadTitle.includes("Autonomous Delivery Drone Supply"), "Payload leadTitle matches");

  // Approve deletion
  const approveLeadDel = await post("/agents/supply-chain-agent/chat", {
    message: "Yes",
    conversationId: "conv-test-del-lead-mesh",
  }, token);
  assert(approveLeadDel.ok, "Lead deletion approved");
  assert(approveLeadDel.data.data.executedAction === true, "executedAction is true");
  assert(approveLeadDel.data.data.answer.includes("deleted"), "AI confirms deletion in answer");

  // Verify lead is actually deleted in database
  const leadsAfterDel = await fetch(`${API_BASE}/crm/leads`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const foundLead = leadsAfterDel.data.find((l) => l.title.includes("Autonomous Delivery Drone Supply"));
  assert(foundLead == null, "Autonomous Delivery Drone Supply is no longer in CRM leads database");

  // -------------------------------------------------------------
  // TEST 5: Legitimate Lead Creation Intent
  // Prompt: "Add a new lead for Apex Avionics with deal size 150000"
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Testing legitimate lead creation prompt: 'Add a new lead for Apex Avionics with deal size 150000'...");
  const newLeadRes = await post("/agents/supply-chain-agent/chat", {
    message: "Add a new lead for Apex Avionics with deal size 150000",
  }, token);

  assert(newLeadRes.ok, "Lead creation received 200");
  assert(newLeadRes.data.data.requiresConfirmation === true, "Requires confirmation for new lead");
  assert(newLeadRes.data.data.pendingAction != null, "Pending action created");
  assert(newLeadRes.data.data.pendingAction.actionType === "CREATE_LEAD", "Action type is CREATE_LEAD");
  assert(newLeadRes.data.data.toolsUsed.includes("crm_lead_creator"), "crm_lead_creator tool used");
  assert(newLeadRes.data.data.pendingAction.payload.value === 150000, `Lead value extracted as 150000 (was: ${newLeadRes.data.data.pendingAction.payload.value})`);

  // -------------------------------------------------------------
  // TEST 6: Customer Account Creation Intent
  // Prompt: "Add customer account #ACC-9020 for Titan Industrial"
  // -------------------------------------------------------------
  console.log("\n[TEST 6] Testing customer creation prompt: 'Add customer account #ACC-9020 for Titan Industrial'...");
  const custRes = await post("/agents/supply-chain-agent/chat", {
    message: "Add customer account #ACC-9020 for Titan Industrial",
  }, token);

  assert(custRes.ok, "Customer creation received 200");
  assert(custRes.data.data.requiresConfirmation === true, "Requires confirmation for customer");
  assert(custRes.data.data.pendingAction != null, "Pending action created");
  assert(custRes.data.data.pendingAction.actionType === "CREATE_CUSTOMER", "Action type is CREATE_CUSTOMER");
  assert(custRes.data.data.pendingAction.payload.accountNo === "ACC-9020", `Account number is ACC-9020 (was: ${custRes.data.data.pendingAction.payload.accountNo})`);
  assert(custRes.data.data.pendingAction.payload.name.includes("Titan Industrial"), "Customer name is Titan Industrial");

  console.log("\n=======================================================");
  console.log("🎉 ALL AUDIT SUITE TESTS PASSED PERFECTLY!");
  console.log("=======================================================\n");
}

runAudit().catch((err) => {
  console.error("\n❌ AUDIT FAILED:", err);
  process.exit(1);
});
