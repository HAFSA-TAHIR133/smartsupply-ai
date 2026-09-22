/**
 * Test Suite: AI Assistant Intent Understanding and Entity Extraction
 *
 * Covers:
 * 1. Disambiguation: Task Creation vs Lead Creation (addresses critical bug)
 * 2. Date extraction formats ("30 sep 2026", "tomorrow", "next week", ISO)
 * 3. Deal value extraction ("$150k", "$50,000", "deal size 75000")
 * 4. Customer account creation disambiguation
 * 5. Inquiries / Questions do NOT trigger mutation actions
 */

import { describe, test } from "node:test";
import { post, assert, getDemoToken } from "./test_helpers.mjs";

describe("Suite 2: AI Intent Understanding and Tool Routing", () => {
  test("2.1 Disambiguate Task vs Lead: 'Add a follow up task of meeting with the lead schedule on 30 sep 2026'", async () => {
    const token = await getDemoToken(true);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Add a follow up task of meeting with the lead schedule on 30 sep 2026",
      },
      token
    );

    assert(res.ok, "Chat response returned 200");
    const data = res.data?.data;
    assert(data.requiresConfirmation === true, "Task creation requires confirmation");
    assert(data.pendingAction != null, "Pending action was generated");
    assert(data.pendingAction.actionType === "CREATE_TASK", "Action MUST be CREATE_TASK");
    assert(data.pendingAction.actionType !== "CREATE_LEAD", "Action MUST NOT be CREATE_LEAD");
    assert(data.toolsUsed.includes("crm_task_creator"), "Used tool crm_task_creator");
    assert(!data.toolsUsed.includes("crm_lead_creator"), "Did NOT use crm_lead_creator");

    const payload = data.pendingAction.payload;
    assert(payload.dueDate === "2026-09-30", `Extracted date '30 sep 2026' -> '2026-09-30' (got: ${payload.dueDate})`);
    assert(payload.title.toLowerCase().includes("meeting"), `Task title cleaned of dates: '${payload.title}'`);
  });

  test("2.2 Date Extraction: 'tomorrow' resolves to tomorrow's ISO date string", async () => {
    const token = await getDemoToken(false);
    const tomorrowExpected = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Add a task to inspect incoming battery shipments tomorrow",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const payload = res.data?.data?.pendingAction?.payload;
    assert(payload != null, "Pending action created");
    assert(payload.dueDate === tomorrowExpected, `Extracted 'tomorrow' -> '${tomorrowExpected}' (got: ${payload.dueDate})`);
  });

  test("2.3 Date Extraction: 'next week' resolves to 7 days ahead", async () => {
    const token = await getDemoToken(false);
    const nextWeekExpected = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Create a task to audit inventory next week",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const payload = res.data?.data?.pendingAction?.payload;
    assert(payload != null, "Pending action created");
    assert(payload.dueDate === nextWeekExpected, `Extracted 'next week' -> '${nextWeekExpected}' (got: ${payload.dueDate})`);
  });

  test("2.4 Disambiguate Lead Creation: 'Add a new lead for Apex Avionics with deal size 150000'", async () => {
    const token = await getDemoToken(false);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Add a new lead for Apex Avionics with deal size 150000",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const data = res.data?.data;
    assert(data.pendingAction != null, "Pending action created");
    assert(data.pendingAction.actionType === "CREATE_LEAD", "Action type is CREATE_LEAD");
    assert(data.toolsUsed.includes("crm_lead_creator"), "Used tool crm_lead_creator");
    assert(!data.toolsUsed.includes("crm_task_creator"), "Did NOT use crm_task_creator");

    const payload = data.pendingAction.payload;
    assert(payload.value === 150000, `Parsed numeric deal size 150000 (got: ${payload.value})`);
    assert(payload.title.includes("Apex Avionics"), `Parsed title 'Apex Avionics' (got: ${payload.title})`);
  });

  test("2.5 Deal value shorthand extraction: '$75k' translates to 75000", async () => {
    const token = await getDemoToken(false);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Create a lead for Orbital Logistics worth $75k",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const payload = res.data?.data?.pendingAction?.payload;
    assert(payload.value === 75000, `Parsed shorthand '$75k' -> 75000 (got: ${payload.value})`);
  });

  test("2.6 Disambiguate Customer Creation: 'Add customer account #ACC-9020 for Titan Industrial'", async () => {
    const token = await getDemoToken(false);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Add customer account #ACC-9020 for Titan Industrial in Aerospace sector",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const data = res.data?.data;
    assert(data.pendingAction != null, "Pending action created");
    assert(data.pendingAction.actionType === "CREATE_CUSTOMER", "Action is CREATE_CUSTOMER");
    assert(data.toolsUsed.includes("crm_customer_creator"), "Used crm_customer_creator tool");

    const payload = data.pendingAction.payload;
    assert(payload.accountNo === "ACC-9020", `Extracted accountNo 'ACC-9020' (got: ${payload.accountNo})`);
    assert(payload.name.includes("Titan Industrial"), `Extracted name 'Titan Industrial' (got: ${payload.name})`);
  });

  test("2.7 Read-only inquiry does NOT stage a mutating pending action", async () => {
    const token = await getDemoToken(false);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "which products are on low stock?",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    assert(res.data?.data?.requiresConfirmation === false, "Inquiry does NOT require confirmation");
    assert(res.data?.data?.pendingAction == null, "Inquiry generates NO pending action");
    assert(res.data?.data?.answer.length > 0, "AI provided direct informational answer");
  });

  test("2.8 Disambiguate Delete Task vs Create Task: 'Delete the Follow up task with Marcus Vance on AeroTech quotation'", async () => {
    const token = await getDemoToken(true);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "Delete the Follow up task with Marcus Vance on AeroTech quotation",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const data = res.data?.data;
    assert(data.requiresConfirmation === true, "Delete task requires confirmation");
    assert(data.pendingAction != null, "Pending action generated");
    assert(data.pendingAction.actionType === "DELETE_TASK", `Action MUST be DELETE_TASK (got: ${data.pendingAction.actionType})`);
    assert(data.pendingAction.actionType !== "CREATE_TASK", "Action MUST NOT be CREATE_TASK");
    assert(data.toolsUsed.includes("crm_task_deleter"), "Used tool crm_task_deleter");
    assert(!data.toolsUsed.includes("crm_task_creator"), "Did NOT use crm_task_creator");

    const payload = data.pendingAction.payload;
    assert(payload.taskTitle.toLowerCase().includes("marcus vance"), `Matched task title contains 'Marcus Vance' (got: ${payload.taskTitle})`);
  });

  test("2.9 Delete Task with conversational prefix: 'please delete the Follow up task with Marcus Vance on AeroTech quotation'", async () => {
    const token = await getDemoToken(true);
    const res = await post(
      "/agents/supply-chain-agent/chat",
      {
        message: "please delete the Follow up task with Marcus Vance on AeroTech quotation",
      },
      token
    );

    assert(res.ok, "Response returned 200");
    const data = res.data?.data;
    assert(data.pendingAction != null, "Pending action generated");
    assert(data.pendingAction.actionType === "DELETE_TASK", `Action MUST be DELETE_TASK (got: ${data.pendingAction.actionType})`);
    assert(data.toolsUsed.includes("crm_task_deleter"), "Used crm_task_deleter");
    assert(!data.toolsUsed.includes("crm_task_creator"), "Did NOT use crm_task_creator");
  });

  test("2.10 Demo Mode Ephemerality: Demo data resets to pristine factory state on reset", async () => {
    const token = await getDemoToken(true);
    // 1. Trigger reset
    const resetRes = await post("/demo/reset", {}, token);
    assert(resetRes.ok, "Reset returned 200");

    // 2. Fetch tasks
    const { get } = await import("./test_helpers.mjs");
    const tasksRes = await get("/crm/tasks", token);
    assert(tasksRes.ok, "Fetched demo tasks");
    const tasks = tasksRes.data?.data || [];
    const marcusTask = tasks.find((t) => t.title?.toLowerCase().includes("marcus vance"));
    assert(marcusTask != null, "Pristine demo task 'Follow up with Marcus Vance on AeroTech quotation' is present");
  });
});
