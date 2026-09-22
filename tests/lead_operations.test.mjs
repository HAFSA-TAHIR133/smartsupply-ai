/**
 * Test Suite: CRM Lead Operations & Stage Transitions
 *
 * Covers:
 * 1. Lead creation via API & AI Agent
 * 2. Finding / searching leads in CRM database
 * 3. Moving lead stage to valid stages (New, Contacted, Qualified, Proposal, Won)
 * 4. Rejecting invalid stage transition (e.g. 'Completed') without DB mutation
 * 5. Deleting lead by exact ID
 * 6. Deleting lead by title
 * 7. Non-existent lead resolution fallback
 */

import { describe, test } from "node:test";
import { post, get, put, del, assert, getDemoToken } from "./test_helpers.mjs";

describe("Suite 3: CRM Lead Operations and Stage Workflows", () => {
  test("3.1 Lead creation via API persists to CRM database", async () => {
    const token = await getDemoToken(true);
    const newLead = {
      title: "Vanguard Robotics Automation",
      company: "Vanguard Robotics",
      value: 120000,
      stage: "New",
      contactName: "Elena Rostova",
      contactEmail: "elena@vanguard.test",
    };

    const res = await post("/crm/leads", newLead, token);
    assert(res.ok, "POST /crm/leads returned 201/200");
    const createdId = res.data?.data?.id;
    assert(createdId != null, "Created lead received unique ID");
    assert(res.data?.data?.title === newLead.title, "Lead title matches");
    assert(res.data?.data?.stage === "New", "Default stage is New");

    // Verify in database via GET
    const fetchRes = await get(`/crm/leads/${createdId}`, token);
    assert(fetchRes.ok, "GET /crm/leads/:id returned 200");
    assert(fetchRes.data?.data?.value === 120000, "Lead value matches persisted value");
  });

  test("3.2 Move lead stage through canonical stages (New -> Contacted -> Qualified -> Proposal -> Won)", async () => {
    const token = await getDemoToken(false);
    // Create test lead
    const createRes = await post("/crm/leads", {
      title: "Stage Pipeline Lead",
      value: 50000,
      stage: "New",
    }, token);
    const leadId = createRes.data?.data?.id;

    // Test transition to Contacted
    const rContacted = await put(`/crm/leads/${leadId}`, { stage: "Contacted" }, token);
    assert(rContacted.ok, "Updated to Contacted");
    assert(rContacted.data?.data?.stage === "Contacted", "Stage in response is Contacted");

    // Test transition to Qualified
    const rQualified = await put(`/crm/leads/${leadId}`, { stage: "Qualified" }, token);
    assert(rQualified.ok, "Updated to Qualified");
    assert(rQualified.data?.data?.stage === "Qualified", "Stage in response is Qualified");

    // Test transition to Proposal
    const rProposal = await put(`/crm/leads/${leadId}`, { stage: "Proposal" }, token);
    assert(rProposal.ok, "Updated to Proposal");
    assert(rProposal.data?.data?.stage === "Proposal", "Stage in response is Proposal");

    // Test transition to Won
    const rWon = await put(`/crm/leads/${leadId}`, { stage: "Won" }, token);
    assert(rWon.ok, "Updated to Won");
    assert(rWon.data?.data?.stage === "Won", "Stage in response is Won");

    // Verify persisted stage
    const verifyRes = await get(`/crm/leads/${leadId}`, token);
    assert(verifyRes.data?.data?.stage === "Won", "Persisted stage in CRM DB is Won");
  });

  test("3.3 AI rejects invalid stage name ('Completed') and leaves database untouched", async () => {
    const token = await getDemoToken(false);
    const res = await post("/agents/supply-chain-agent/chat", {
      message: "Move National Courier Fleet Automation to Completed",
    }, token);

    assert(res.ok, "Agent chat returned 200");
    assert(res.data?.data?.requiresConfirmation === false, "Does NOT stage mutation for invalid stage");
    assert(res.data?.data?.pendingAction == null, "Pending action is null");
    const answer = res.data?.data?.answer || "";
    assert(
      answer.includes("New, Contacted, Qualified, Proposal, Won"),
      `Informs user of valid canonical stages (got: ${answer})`
    );

    // Verify lead was NOT mutated in database
    const leadsRes = await get("/crm/leads", token);
    const nationalCourier = leadsRes.data?.data?.find(l => l.title.includes("National Courier"));
    assert(nationalCourier.stage !== "Completed", "National Courier stage was NOT changed to Completed");
  });

  test("3.4 Delete lead by exact ID removes record from CRM database", async () => {
    const token = await getDemoToken(false);
    // Create ephemeral lead
    const createRes = await post("/crm/leads", {
      title: "Ephemeral Test Lead",
      value: 10000,
      stage: "New",
    }, token);
    const leadId = createRes.data?.data?.id;

    // Delete
    const delRes = await del(`/crm/leads/${leadId}`, token);
    assert(delRes.ok, "DELETE /crm/leads/:id returned 200");

    // Verify 404 on fetch
    const fetchAfterDel = await get(`/crm/leads/${leadId}`, token);
    assert(fetchAfterDel.status === 404, "Deleted lead returns 404");
  });

  test("3.5 Delete lead by title via AI Agent stages confirmation", async () => {
    const token = await getDemoToken(false);
    // Create ephemeral lead
    await post("/crm/leads", {
      title: "SolarGrid Battery Storage Supply",
      value: 90000,
      stage: "New",
    }, token);

    const chatRes = await post("/agents/supply-chain-agent/chat", {
      message: "delete lead SolarGrid Battery Storage Supply",
    }, token);

    assert(chatRes.ok, "Agent returned 200");
    assert(chatRes.data?.data?.requiresConfirmation === true, "Requires confirmation for lead deletion");
    assert(chatRes.data?.data?.pendingAction?.actionType === "DELETE_LEAD", "Pending action is DELETE_LEAD");
    assert(chatRes.data?.data?.pendingAction?.payload?.leadTitle.includes("SolarGrid"), "Payload identifies target lead");
  });

  test("3.6 AI agent handles non-existent lead ID without staging phantom action", async () => {
    const token = await getDemoToken(false);
    const chatRes = await post("/agents/supply-chain-agent/chat", {
      message: "delete the lead #L-99999",
    }, token);

    assert(chatRes.ok, "Agent returned 200");
    assert(chatRes.data?.data?.requiresConfirmation === false, "Must NOT require confirmation for non-existent lead");
    assert(chatRes.data?.data?.pendingAction == null, "Must NOT stage pending action");
    assert(chatRes.data?.data?.answer.includes("L-99999"), "Mentions target ID was not found");
  });
});
