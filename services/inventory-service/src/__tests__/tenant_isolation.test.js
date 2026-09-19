import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// Mock models
jest.unstable_mockModule("../db/models/index.js", () => ({
  Product: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  Chart: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  StockLog: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  Notification: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(),
  },
}));

const { Product, Chart } = await import("../db/models/index.js");
const { getCharts, deleteChart } = await import("../controllers/chartController.js");
const { getProductById, deleteProduct } = await import("../controllers/inventoryController.js");

describe("Task 4 — Multi-Tenant & User Data Isolation Tests", () => {
  const userA = { id: "usr-aaa-111", tenantId: "tenant-aaa", isDemo: false };
  const userB = { id: "usr-bbb-222", tenantId: "tenant-bbb", isDemo: false };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("User A cannot view User B's charts (Tenant Isolation)", async () => {
    Chart.findAll.mockResolvedValueOnce([
      { id: "chart-1", title: "User A Chart", userId: userA.id, tenantId: userA.tenantId },
    ]);

    const req = { tenantId: userA.tenantId, user: userA };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getCharts(req, res);

    expect(Chart.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: userA.tenantId,
          userId: userA.id,
        },
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 200,
        response: "OK",
      })
    );
  });

  test("User A cannot delete User B's chart (403 Forbidden)", async () => {
    // Chart exists under Tenant A, but belongs to User B (cross-user check)
    Chart.findOne.mockResolvedValueOnce({
      id: "chart-b",
      userId: userB.id,
      tenantId: userA.tenantId,
    });

    const req = {
      params: { id: "chart-b" },
      tenantId: userA.tenantId,
      user: userA,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await deleteChart(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        message: "You do not have permission to delete this chart.",
      })
    );
  });

  test("User A cannot fetch product belonging to Tenant B (404 Not Found)", async () => {
    Product.findOne.mockResolvedValueOnce(null);

    const req = {
      params: { id: "prod-tenant-b" },
      tenantId: userA.tenantId,
      user: userA,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getProductById(req, res);

    expect(Product.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod-tenant-b", tenantId: userA.tenantId },
      })
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
