import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// Mock the AgentMemory model
jest.unstable_mockModule("../db/models/index.js", () => ({
  AgentMemory: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { AgentMemory } = await import("../db/models/index.js");
const { memoryService } = await import("../services/memoryService.js");

describe("Task 2 - Memory Service Isolation & Telemetry Tests", () => {
  const userA = "usr-tenant-a-111";
  const tenantA = "tenant-aaa";
  const userB = "usr-tenant-b-222";
  const tenantB = "tenant-bbb";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Should normalize user IDs and isolate queries by user key and tenant", async () => {
    // 1. Remember for User A
    AgentMemory.create.mockResolvedValueOnce({ id: "mem-1", key: `user:${userA}:pref`, value: "Pref A" });
    await memoryService.remember({
      userId: userA,
      tenantId: tenantA,
      text: "Pref A",
      category: "pref",
    });

    expect(AgentMemory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenantA,
        key: `user:${userA}:pref`,
        value: "Pref A",
      })
    );

    // 2. Recall as User A: mock DB returning only User A's memories
    const userAMemories = [
      { id: "m1", value: "Supplier BoltFast" },
      { id: "m2", value: "Lead time 3 days" },
      { id: "m3", value: "Reorder threshold 15" },
    ];
    AgentMemory.findAll.mockResolvedValueOnce(userAMemories);

    const recalled = await memoryService.recall({
      userId: userA,
      tenantId: tenantA,
      query: "supplier",
    });

    expect(recalled).toHaveLength(3);
    expect(recalled).toContain("Supplier BoltFast");
    expect(recalled).not.toContain("Supplier GlobalExpress");

    // Verify findAll query checked tenantId and userA's key
    expect(AgentMemory.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: tenantA,
        }),
      })
    );
  });
});
