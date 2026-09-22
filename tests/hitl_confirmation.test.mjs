/**
 * Test Suite: Human-in-the-Loop (HITL) Confirmation and Mutation Guarantees
 *
 * Covers:
 * 1. Pre-confirmation invariant: Database is NEVER mutated before explicit user confirmation.
 * 2. Affirmative execution: After explicit approval ('Yes'), the staged tool executes and DB reflects change.
 * 3. Negative rejection: After rejection ('No' / 'cancel'), mutation does NOT happen and pending state is cleared.
 * 4. Post-rejection idempotency: An approved command sent after cancellation does not execute the discarded action.
 * 5. Action isolation: Approving operation A never approves or executes a distinct operation B.
 */

import { describe, test } from "node:test";
import { post, get, assert, getDemoToken } from "./test_helpers.mjs";

describe("Suite 4: Human-in-the-Loop Confirmation Rigor", () => {
  test("4.1 Invariant: DB state is UNCHANGED while pending action awaits confirmation", async () => {
    const token = await getDemoToken(true);

    // Initial stock
    const invBefore = await get("/inventory/products", token);
    const motorBefore = invBefore.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    assert(motorBefore != null, "Brushless Motor exists in inventory");
    const initialQty = motorBefore.quantity;

    // Stage restock
    const stageRes = await post("/agents/supply-chain-agent/chat", {
      message: "restock Brushless Motor 24V High-Torque by 20 units",
      conversationId: "conv-hitl-invar-1",
    }, token);

    assert(stageRes.ok, "Chat returned 200");
    assert(stageRes.data?.data?.requiresConfirmation === true, "Requires confirmation");
    assert(stageRes.data?.data?.pendingAction != null, "Action staged");
    const actionId = stageRes.data?.data?.pendingAction?.id;

    // INVARIANT CHECK: Database MUST NOT be updated before confirmation
    const invImmediate = await get("/inventory/products", token);
    const motorImmediate = invImmediate.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    assert(
      motorImmediate.quantity === initialQty,
      `INVARIANT: Stock remains unchanged before approval (${motorImmediate.quantity} === ${initialQty})`
    );
  });

  test("4.2 Affirmative approval executes staged action and updates DB", async () => {
    const token = await getDemoToken(false);
    const invBefore = await get("/inventory/products", token);
    const motorBefore = invBefore.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    const qtyBefore = motorBefore.quantity;

    // Stage restock
    const stageRes = await post("/agents/supply-chain-agent/chat", {
      message: "restock Brushless Motor 24V High-Torque by 20 units",
      conversationId: "conv-hitl-approve-1",
    }, token);

    // Approve
    const approveRes = await post("/agents/supply-chain-agent/chat", {
      message: "Yes, please proceed",
      conversationId: "conv-hitl-approve-1",
    }, token);

    assert(approveRes.ok, "Approval chat returned 200");
    assert(approveRes.data?.data?.executedAction === true, "executedAction is true");

    // DB Verification
    const invAfter = await get("/inventory/products", token);
    const motorAfter = invAfter.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    assert(
      motorAfter.quantity === qtyBefore + 20,
      `Stock updated by +20 in database (was: ${qtyBefore}, now: ${motorAfter.quantity})`
    );
  });

  test("4.3 Rejection cancels staged action, leaves DB unchanged, and marks action REJECTED", async () => {
    const token = await getDemoToken(false);
    const invBefore = await get("/inventory/products", token);
    const motorBefore = invBefore.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    const qtyBefore = motorBefore.quantity;

    // Stage restock
    const stageRes = await post("/agents/supply-chain-agent/chat", {
      message: "restock Brushless Motor 24V High-Torque by 50 units",
      conversationId: "conv-hitl-reject-1",
    }, token);

    const actionId = stageRes.data?.data?.pendingAction?.id;

    // Reject
    const rejectRes = await post("/agents/supply-chain-agent/chat", {
      message: "No, cancel that restock request",
      conversationId: "conv-hitl-reject-1",
    }, token);

    assert(rejectRes.ok, "Rejection returned 200");
    assert(rejectRes.data?.data?.executedAction === false, "executedAction is false");
    assert(rejectRes.data?.data?.pendingAction?.status === "REJECTED", "Action marked REJECTED");

    // DB Verification: stock must be completely unchanged
    const invAfter = await get("/inventory/products", token);
    const motorAfter = invAfter.data?.data?.find((p) => p.sku === "MTR-BRSH-024");
    assert(
      motorAfter.quantity === qtyBefore,
      `Stock was NOT changed after rejection (${motorAfter.quantity} === ${qtyBefore})`
    );
  });

  test("4.4 Approving after rejection is rejected (cannot execute a discarded action)", async () => {
    const token = await getDemoToken(false);

    // Follow-up after rejection: saying "yes" should not execute anything
    const followUpRes = await post("/agents/supply-chain-agent/chat", {
      message: "Yes, confirm",
      conversationId: "conv-hitl-reject-1",
    }, token);

    assert(followUpRes.ok, "Response returned 200");
    assert(
      followUpRes.data?.data?.executedAction === false,
      "Did NOT execute any action after prior cancellation"
    );
  });

  test("4.5 Action Isolation: Direct approval of action A never executes action B", async () => {
    const token = await getDemoToken(false);

    // Stage action A (restock)
    const stageA = await post("/agents/supply-chain-agent/chat", {
      message: "restock Optoelectronic Sensor 5V by 15 units",
      conversationId: "conv-action-a",
    }, token);
    const actionAId = stageA.data?.data?.pendingAction?.id;

    // Stage action B (delete lead)
    const stageB = await post("/agents/supply-chain-agent/chat", {
      message: "delete lead Autonomous Delivery Drone Supply",
      conversationId: "conv-action-b",
    }, token);
    const actionBId = stageB.data?.data?.pendingAction?.id;

    assert(actionAId !== actionBId, "Actions have distinct IDs");

    // Explicitly approve action A via API endpoint
    const approveARes = await post(`/actions/pending/${actionAId}/approve`, {}, token);
    assert(approveARes.ok, "Action A approved");

    // Check status of action B: it must still be PENDING (not approved)
    const actionBCheck = await get(`/actions/pending/${actionBId}`, token);
    const actionBStatus = actionBCheck.data?.data?.status;
    assert(
      actionBStatus === "PENDING" || actionBStatus === "PENDING_CONFIRMATION",
      `Action B remains PENDING and was not touched by Action A approval (status: ${actionBStatus})`
    );

    // Check that lead was NOT deleted
    const leadsRes = await get("/crm/leads", token);
    const droneLead = leadsRes.data?.data?.find((l) => l.title.includes("Autonomous Delivery Drone"));
    assert(droneLead != null, "Lead still exists in database");
  });

  test("4.6 Pending HITL action is preserved across intermediate read-only questions", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-hitl-retain-across-q";

    // 1. Stage an action
    const stageRes = await post("/agents/supply-chain-agent/chat", {
      message: "restock Brushless Motor 24V High-Torque by 10 units",
      conversationId: convId,
    }, token);

    assert(stageRes.ok, "Turn 1 returned 200");
    assert(stageRes.data?.data?.requiresConfirmation === true, "Turn 1 requires confirmation");
    const stagedId = stageRes.data?.data?.pendingAction?.id;
    assert(stagedId != null, "Turn 1 staged action created");

    // 2. Intermediate turn: user asks a read-only question
    const qRes = await post("/agents/supply-chain-agent/chat", {
      message: "What is my current inventory status?",
      conversationId: convId,
    }, token);

    assert(qRes.ok, "Turn 2 question returned 200");
    assert(qRes.data?.data?.requiresConfirmation === false, "Turn 2 question does not require confirmation");

    // 3. Pending action must still be intact and pending
    const checkAction = await get(`/actions/pending/${stagedId}`, token);
    assert(checkAction.ok, "Pending action still exists");
    assert(
      checkAction.data?.data?.status === "PENDING" || checkAction.data?.data?.status === "PENDING_CONFIRMATION",
      "Pending action status is still PENDING after intermediate question"
    );

    // 4. User confirms the action in Turn 3
    const confirmRes = await post("/agents/supply-chain-agent/chat", {
      message: "Yes, go ahead and restock it",
      conversationId: convId,
    }, token);

    assert(confirmRes.ok, "Turn 3 confirmation returned 200");
    assert(confirmRes.data?.data?.executedAction === true, "Turn 3 executedAction is true");
    assert(confirmRes.data?.data?.answer.toLowerCase().includes("done"), "Confirmation reports success");
  });

  test("4.7 Assistant does not report success when action fails or has no pending action", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-hitl-no-pending";

    // Saying "yes" when there is no pending action
    const res = await post("/agents/supply-chain-agent/chat", {
      message: "Yes, please confirm and proceed",
      conversationId: convId,
    }, token);

    assert(res.ok, "Chat returned 200");
    assert(res.data?.data?.executedAction === false, "executedAction is false");
    assert(
      res.data?.data?.answer.toLowerCase().includes("no pending action") ||
      res.data?.data?.answer.toLowerCase().includes("no pending"),
      `Informs user no pending action exists (got: ${res.data?.data?.answer})`
    );
  });
});
