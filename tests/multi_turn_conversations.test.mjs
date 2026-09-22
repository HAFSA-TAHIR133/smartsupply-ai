/**
 * Test Suite: Multi-Turn Conversations & Clarification Workflows
 *
 * Covers:
 * 1. Multi-Turn Example A: Incomplete delete lead -> clarification -> lead specified -> staging
 * 2. Multi-Turn Example B: Incomplete task creation -> clarification -> lead specified -> staging
 * 3. Multi-Turn Example C: Incomplete stage transition -> clarification -> lead specified -> staging
 * 4. Multi-Turn Example D: Incomplete restock -> product specified -> quantity specified -> staging
 * 5. Context & History Continuity: Conversation history persisted with chronological order and roles
 */

import { describe, test } from "node:test";
import { post, get, assert, getDemoToken } from "./test_helpers.mjs";

describe("Suite 5: Multi-Turn Clarification and Context Workflows", () => {
  test("5.1 Multi-Turn Example A: 'Delete lead' -> ask which lead -> provide title -> stage DELETE_LEAD", async () => {
    const token = await getDemoToken(true);
    const convId = "conv-turn-ex-a";

    // Turn 1: User gives incomplete command
    const res1 = await post("/agents/supply-chain-agent/chat", {
      message: "Delete lead",
      conversationId: convId,
    }, token);

    assert(res1.ok, "Turn 1 returned 200");
    assert(res1.data?.data?.requiresConfirmation === false, "Turn 1 does NOT require confirmation");
    assert(res1.data?.data?.pendingAction == null, "Turn 1 has no pending action");
    assert(
      res1.data?.data?.answer.toLowerCase().includes("which lead"),
      `Agent asks which lead to delete (got: ${res1.data?.data?.answer})`
    );

    // Turn 2: User provides lead name
    const res2 = await post("/agents/supply-chain-agent/chat", {
      message: "National Courier",
      conversationId: convId,
    }, token);

    assert(res2.ok, "Turn 2 returned 200");
    assert(res2.data?.data?.requiresConfirmation === true, "Turn 2 requires confirmation");
    assert(res2.data?.data?.pendingAction?.actionType === "DELETE_LEAD", "Action type is DELETE_LEAD");
    assert(
      res2.data?.data?.pendingAction?.payload?.leadTitle.includes("National Courier"),
      "Pending action targets National Courier"
    );
  });

  test("5.2 Multi-Turn Example B: 'Create a follow-up task for my lead' -> ask which lead -> provide title -> stage CREATE_TASK", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-turn-ex-b";

    // Turn 1: User asks to create task for lead without specifying which
    const res1 = await post("/agents/supply-chain-agent/chat", {
      message: "Create a follow-up task for my lead",
      conversationId: convId,
    }, token);

    assert(res1.ok, "Turn 1 returned 200");
    assert(res1.data?.data?.requiresConfirmation === false, "Turn 1 does NOT require confirmation");
    assert(res1.data?.data?.pendingAction == null, "Turn 1 has no pending action");
    assert(
      res1.data?.data?.answer.toLowerCase().includes("which lead"),
      `Agent asks which lead (got: ${res1.data?.data?.answer})`
    );

    // Turn 2: User provides lead name
    const res2 = await post("/agents/supply-chain-agent/chat", {
      message: "National Courier",
      conversationId: convId,
    }, token);

    assert(res2.ok, "Turn 2 returned 200");
    assert(res2.data?.data?.requiresConfirmation === true, "Turn 2 requires confirmation");
    assert(res2.data?.data?.pendingAction?.actionType === "CREATE_TASK", "Action type is CREATE_TASK");
    assert(
      res2.data?.data?.pendingAction?.payload?.leadTitle.includes("National Courier"),
      "Task is associated with National Courier"
    );
  });

  test("5.3 Multi-Turn Example C: 'Move lead to Won' -> ask which lead -> provide title -> stage EDIT_LEAD", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-turn-ex-c";

    // Turn 1: User asks to move lead to Won without specifying which lead
    const res1 = await post("/agents/supply-chain-agent/chat", {
      message: "Move lead to Won",
      conversationId: convId,
    }, token);

    assert(res1.ok, "Turn 1 returned 200");
    assert(res1.data?.data?.requiresConfirmation === false, "Turn 1 does NOT require confirmation");
    assert(
      res1.data?.data?.answer.toLowerCase().includes("which lead"),
      `Agent prompts for lead identity (got: ${res1.data?.data?.answer})`
    );

    // Turn 2: User specifies lead name
    const res2 = await post("/agents/supply-chain-agent/chat", {
      message: "National Courier",
      conversationId: convId,
    }, token);

    assert(res2.ok, "Turn 2 returned 200");
    assert(res2.data?.data?.requiresConfirmation === true, "Turn 2 requires confirmation");
    assert(res2.data?.data?.pendingAction?.actionType === "EDIT_LEAD", "Action type is EDIT_LEAD");
    assert(
      res2.data?.data?.pendingAction?.payload?.updates?.stage === "Won",
      "Updates stage to Won"
    );
  });

  test("5.4 Multi-Turn Example D: 'Restock product' -> ask which product -> specify -> ask quantity -> specify -> stage RESTOCK_PRODUCT", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-turn-ex-d";

    // Turn 1: User says restock product
    const res1 = await post("/agents/supply-chain-agent/chat", {
      message: "Restock product",
      conversationId: convId,
    }, token);

    assert(res1.ok, "Turn 1 returned 200");
    assert(res1.data?.data?.requiresConfirmation === false, "Turn 1 does not require confirmation");
    assert(
      res1.data?.data?.answer.toLowerCase().includes("which product") ||
      res1.data?.data?.answer.toLowerCase().includes("which item"),
      `Agent asks which product (got: ${res1.data?.data?.answer})`
    );

    // Turn 2: User specifies product name
    const res2 = await post("/agents/supply-chain-agent/chat", {
      message: "Brushless Motor",
      conversationId: convId,
    }, token);

    assert(res2.ok, "Turn 2 returned 200");
    assert(
      res2.data?.data?.answer.toLowerCase().includes("how many") ||
      res2.data?.data?.answer.toLowerCase().includes("quantity"),
      `Agent asks for quantity (got: ${res2.data?.data?.answer})`
    );

    // Turn 3: User specifies quantity
    const res3 = await post("/agents/supply-chain-agent/chat", {
      message: "25",
      conversationId: convId,
    }, token);

    assert(res3.ok, "Turn 3 returned 200");
    assert(res3.data?.data?.requiresConfirmation === true, "Turn 3 requires confirmation");
    assert(
      res3.data?.data?.pendingAction?.actionType === "RESTOCK_PRODUCT",
      "Action type is RESTOCK_PRODUCT"
    );
    assert(
      res3.data?.data?.pendingAction?.payload?.quantity === 25,
      `Quantity is 25 (got: ${res3.data?.data?.pendingAction?.payload?.quantity})`
    );
  });

  test("5.5 Conversation history persistence preserves message sequence and metadata", async () => {
    const token = await getDemoToken(false);
    const convId = "conv-turn-history-audit";

    await post("/agents/supply-chain-agent/chat", {
      message: "What is my current inventory status?",
      conversationId: convId,
    }, token);

    await post("/agents/supply-chain-agent/chat", {
      message: "Which leads are currently in Qualified stage?",
      conversationId: convId,
    }, token);

    const histRes = await get(`/conversations/${convId}/messages`, token);
    assert(histRes.ok, "GET /conversations/:id/messages returned 200");
    const messages = histRes.data?.data?.messages || (Array.isArray(histRes.data?.data) ? histRes.data?.data : []);
    assert(messages.length >= 4, `Conversation has at least 4 messages (got: ${messages.length})`);

    // Verify chronological order and roles
    assert(messages[0].sender === "USER", "First message from USER");
    assert(messages[1].sender === "AGENT", "Second message from AGENT");
    assert(messages[2].sender === "USER", "Third message from USER");
    assert(messages[3].sender === "AGENT", "Fourth message from AGENT");
  });
});
