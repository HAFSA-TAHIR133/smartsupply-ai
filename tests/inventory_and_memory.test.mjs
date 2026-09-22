/**
 * Test Suite: Inventory Operations, Tenant Data Isolation, and Mem0 Memory
 *
 * Covers:
 * 1. Inventory CRUD operations & stock intake/logs
 * 2. Multi-tenant and user data isolation across distinct live accounts
 * 3. Mem0 long-term memory integration, user scoping, and token efficiency
 * 4. Specific Regression: 'delete the lead #L-2357' context retention and disambiguation
 */

import { describe, test } from "node:test";
import { post, get, put, del, assert, getDemoToken, createLiveUser } from "./test_helpers.mjs";
import { memoryService } from "../apps/web/lib/server/memory.js";

describe("Suite 6: Inventory Operations, Tenant Isolation, and Mem0 Memory", () => {
  // ── 6.1 INVENTORY OPERATIONS ──────────────────────────────────────────────
  test("6.1 Inventory product lifecycle: create, adjust stock, verify logs, update, delete", async () => {
    const token = await getDemoToken(false);

    // 1. Create Product
    const newProd = {
      name: "High-Precision Rotary Encoder 5V",
      sku: `ENC-ROT-${Date.now() % 10000}`,
      category: "Sensors",
      quantity: 15,
      reorderPoint: 20,
      unitPrice: 85.5,
      description: "Optical quadrature rotary encoder for industrial automation",
    };

    const createRes = await post("/inventory/products", newProd, token);
    assert(createRes.ok, "POST /inventory/products returned 201/200");
    const prodId = createRes.data?.data?.id;
    assert(prodId != null, "Product received ID");
    assert(createRes.data?.data?.name === newProd.name, "Product name matches");
    assert(createRes.data?.data?.quantity === 15, "Initial quantity matches");

    // 2. Adjust Stock (Intake +35 units)
    const adjustRes = await post(`/inventory/${prodId}/stock`, {
      changeType: "IN",
      quantityDelta: 35,
      reason: "Supplier delivery intake",
    }, token);
    assert(adjustRes.ok, "Stock adjustment returned 200");
    const updatedProd = adjustRes.data?.data?.product || adjustRes.data?.data;
    assert(updatedProd.quantity === 50, `Quantity updated to 50 (got: ${updatedProd.quantity})`);

    // 3. Verify Stock History / Logs
    const historyRes = await get(`/inventory/${prodId}/history`, token);
    assert(historyRes.ok, "GET /inventory/:id/history returned 200");
    const logs = historyRes.data?.data || [];
    assert(logs.length > 0, "Stock change log recorded");
    const lastLog = logs[0];
    assert(lastLog.changeType === "IN", "Log records IN change");
    assert(lastLog.quantityDelta === 35, "Log records +35 delta");

    // 4. Update Product Metadata
    const updateRes = await put(`/inventory/${prodId}`, {
      unitPrice: 89.99,
      reorderPoint: 25,
    }, token);
    assert(updateRes.ok, "PUT /inventory/:id returned 200");
    const fetchedAfterUpdate = await get(`/inventory/${prodId}`, token);
    assert(fetchedAfterUpdate.data?.data?.unitPrice === 89.99, "Unit price updated");

    // 5. Delete Product
    const delRes = await del(`/inventory/${prodId}`, token);
    assert(delRes.ok, "DELETE /inventory/:id returned 200");
    const fetchAfterDel = await get(`/inventory/${prodId}`, token);
    assert(fetchAfterDel.status === 404, "Deleted product returns 404");
  });

  // ── 6.2 TENANT & USER ISOLATION ───────────────────────────────────────────
  test("6.2 Tenant Data Isolation: User A and User B cannot access each other's data", async () => {
    const ts = Date.now();
    const userA = await createLiveUser(ts);
    const userB = await createLiveUser(ts + 1);

    assert(userA.user.tenantId !== userB.user.tenantId, "Tenant IDs are strictly isolated");

    // User A creates a confidential lead
    const leadARes = await post("/crm/leads", {
      title: "Confidential Project Alpha",
      value: 500000,
      stage: "Qualified",
    }, userA.token);
    assert(leadARes.ok, "User A lead created");
    const leadAId = leadARes.data?.data?.id;

    // User B lists leads: MUST NOT contain User A's lead
    const userBLeads = await get("/crm/leads", userB.token);
    assert(userBLeads.ok, "User B fetched leads");
    const leakedLead = (userBLeads.data?.data || []).find((l) => l.id === leadAId || l.title.includes("Project Alpha"));
    assert(leakedLead == null, "User B cannot see User A's lead in list");

    // User B attempts direct fetch of User A's lead
    const userBDirectFetch = await get(`/crm/leads/${leadAId}`, userB.token);
    assert(
      userBDirectFetch.status === 404 || userBDirectFetch.data?.data == null,
      "User B direct access to User A lead is blocked (404/null)"
    );
  });

  // ── 6.3 MEM0 LONG-TERM MEMORY & CONTEXT EFFICIENCY ────────────────────────
  test("6.3 Mem0 Memory: tenant scoping, relevance ranking, and token efficiency", async () => {
    const contextUser1 = {
      isDemo: true,
      user: { id: "user-buyer-1", tenantId: "tenant-acme-1" },
    };
    const contextUser2 = {
      isDemo: true,
      user: { id: "user-buyer-2", tenantId: "tenant-acme-2" },
    };

    // 1. Store preferences for User 1
    await memoryService.remember(contextUser1, {
      text: "Prefers shipments delivered via freight on Tuesdays",
      category: "LOGISTICS",
    });
    await memoryService.remember(contextUser1, {
      text: "Key supplier contact is Marcus Vance at Prime Logistics",
      category: "SUPPLIER",
    });
    await memoryService.remember(contextUser1, {
      text: "Minimum safety stock buffer for motors is 25 units",
      category: "INVENTORY",
    });

    // 2. Store distinct preference for User 2 (different tenant)
    await memoryService.remember(contextUser2, {
      text: "Key supplier contact is Sarah Chen at Global Express",
      category: "SUPPLIER",
    });

    // 3. User 1 recalls supplier context
    const recalledU1 = await memoryService.recall(contextUser1, {
      query: "who is our supplier contact?",
      limit: 3,
    });

    assert(recalledU1.length > 0, "User 1 recalled relevant memories");
    assert(
      recalledU1.some((m) => m.includes("Marcus Vance")),
      "User 1 recalls Marcus Vance"
    );
    assert(
      !recalledU1.some((m) => m.includes("Sarah Chen")),
      "User 1 DOES NOT leak User 2's supplier memory (Tenant Isolation)"
    );

    // 4. Token Efficiency: Result is bounded (max 5 items, not entire chat history)
    const boundedRecall = await memoryService.recall(contextUser1, {
      query: "logistics inventory stock",
      limit: 2,
    });
    assert(boundedRecall.length <= 2, `Recall strictly respects limit=2 (got: ${boundedRecall.length})`);
    assert(
      boundedRecall.every((item) => typeof item === "string" && item.length < 500),
      "Each memory item is a compact context snippet"
    );
  });

  // ── 6.4 REGRESSION: 'delete the lead #L-2357' ──────────────────────────────
  test("6.4 Regression: 'delete the lead #L-2357' matches lead and retains context across follow-up turns", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-reg-lead-2357";

    // 1. Seed a lead with account number / ID 'L-2357'
    const createRes = await post("/crm/leads", {
      title: "SolarGrid Power Distribution",
      accountNo: "L-2357",
      value: 85000,
      stage: "Qualified",
    }, token);

    assert(createRes.ok, "Seed lead created");
    const leadId = createRes.data?.data?.id;

    // 2. Turn 1: User says "delete the lead #L-2357"
    const turn1Res = await post("/agents/supply-chain-agent/chat", {
      message: "delete the lead #L-2357",
      conversationId: convId,
    }, token);

    assert(turn1Res.ok, "Turn 1 returned 200");
    assert(turn1Res.data?.data?.requiresConfirmation === true, "Turn 1 requires confirmation");
    assert(
      turn1Res.data?.data?.pendingAction?.actionType === "DELETE_LEAD",
      "Action type is DELETE_LEAD"
    );
    assert(
      turn1Res.data?.data?.pendingAction?.payload?.leadId === leadId ||
      turn1Res.data?.data?.pendingAction?.payload?.leadTitle.includes("SolarGrid"),
      "Pending action targets the correct lead #L-2357"
    );

    // 3. Turn 2: Follow-up confirmation
    const turn2Res = await post("/agents/supply-chain-agent/chat", {
      message: "Yes, delete it",
      conversationId: convId,
    }, token);

    assert(turn2Res.ok, "Turn 2 returned 200");
    assert(turn2Res.data?.data?.executedAction === true, "Turn 2 executedAction is true");
    assert(
      turn2Res.data?.data?.answer.toLowerCase().includes("deleted") ||
      turn2Res.data?.data?.answer.toLowerCase().includes("done"),
      "Confirmation indicates lead was deleted"
    );

    // 4. Verify actual deletion in database
    const verifyRes = await get(`/crm/leads/${leadId}`, token);
    assert(verifyRes.status === 404, "Lead was permanently removed from CRM database");
  });
});
