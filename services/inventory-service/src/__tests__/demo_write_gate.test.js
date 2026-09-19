/**
 * @file demo_write_gate.test.js
 * @description Integration tests for the demo account write gate.
 *
 * Tests ensure that:
 * 1. Demo users receive realistic success responses.
 * 2. Demo mutations are NEVER persisted to the database (transaction rolled back).
 * 3. Real users' mutations ARE persisted (transaction committed).
 * 4. isDemo flag is correctly handled.
 */

// ── ESM Mocking (must be at the top, before any dynamic imports) ──────────────
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

// Track rollback/commit separately so we can assert on them
const mockRollback = jest.fn().mockResolvedValue(undefined);
const mockCommit = jest.fn().mockResolvedValue(undefined);
const recordWriteGateEvent = jest.fn();
const noticeError = jest.fn();
const mockTransaction = jest.fn();

// The factory returns an object whose transaction function delegates to mockTransaction
jest.unstable_mockModule("../db/index.js", () => ({
  sequelize: {
    transaction: (...args) => mockTransaction(...args),
  },
}));

jest.unstable_mockModule("../utils/newrelicHelper.js", () => ({
  newrelicHelper: {
    recordWriteGateEvent: (...args) => recordWriteGateEvent(...args),
    noticeError: (...args) => noticeError(...args),
  },
}));

// ── Import module AFTER mocks are registered ──────────────────────────────────
const { executeWithWriteGate } = await import("../utils/writeGate.js");

// ── Helper ─────────────────────────────────────────────────────────────────────
const makeUser = (overrides = {}) => ({
  id: "user-test-123",
  tenantId: "tenant-test-abc",
  isDemo: false,
  role: "ADMIN",
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("WriteGate — Demo Account Behavior", () => {
  beforeEach(() => {
    // Reset call history and restore implementations
    mockRollback.mockReset().mockResolvedValue(undefined);
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockTransaction.mockReset().mockImplementation(async () => ({
      rollback: mockRollback,
      commit: mockCommit,
      finished: false,
    }));
    recordWriteGateEvent.mockReset();
    noticeError.mockReset();
  });

  // ── Demo User ────────────────────────────────────────────────────────────────

  test("DEMO: operation callback is called with the transaction object", async () => {
    const operation = jest.fn().mockResolvedValue({ id: "prod-1", name: "Widget" });
    const demoUser = makeUser({ isDemo: true });

    await executeWithWriteGate(demoUser, operation, { actionType: "create_product" });

    expect(operation).toHaveBeenCalledTimes(1);
    // The first argument should be the mock transaction
    expect(operation).toHaveBeenCalledWith(
      expect.objectContaining({ rollback: expect.any(Function), commit: expect.any(Function) })
    );
  });

  test("DEMO: transaction is ROLLED BACK — mutations do not persist", async () => {
    const operation = jest.fn().mockResolvedValue({ id: "prod-2", name: "Widget B" });
    const demoUser = makeUser({ isDemo: true });

    await executeWithWriteGate(demoUser, operation, { actionType: "create_product" });

    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test("DEMO: returns the operation result with _simulated: true and isDemo: true flags", async () => {
    const productData = { id: "prod-3", name: "Blue Widget", quantity: 100 };
    const operation = jest.fn().mockResolvedValue(productData);
    const demoUser = makeUser({ isDemo: true });

    const result = await executeWithWriteGate(demoUser, operation, { actionType: "create_product" });

    expect(result).toMatchObject({
      id: "prod-3",
      name: "Blue Widget",
      quantity: 100,
      _simulated: true,
      isDemo: true,
    });
  });

  test("DEMO: returns operation result as-is when it is a primitive (not a plain object)", async () => {
    const operation = jest.fn().mockResolvedValue(42);
    const demoUser = makeUser({ isDemo: true });

    const result = await executeWithWriteGate(demoUser, operation, { actionType: "delete_product" });

    expect(result).toBe(42);
    expect(mockRollback).toHaveBeenCalledTimes(1);
  });

  // ── Real User ────────────────────────────────────────────────────────────────

  test("REAL: transaction is COMMITTED — mutations persist", async () => {
    const operation = jest.fn().mockResolvedValue({ id: "prod-4", name: "Real Widget" });
    const realUser = makeUser({ isDemo: false });

    await executeWithWriteGate(realUser, operation, { actionType: "create_product" });

    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockRollback).not.toHaveBeenCalled();
  });

  test("REAL: returns operation result exactly — no extra flags added", async () => {
    const productData = { id: "prod-5", name: "Actual Widget", quantity: 50 };
    const operation = jest.fn().mockResolvedValue(productData);
    const realUser = makeUser({ isDemo: false });

    const result = await executeWithWriteGate(realUser, operation, { actionType: "create_product" });

    expect(result).toEqual(productData);
    expect(result._simulated).toBeUndefined();
  });

  // ── Error Handling ────────────────────────────────────────────────────────────

  test("REAL: rolls back and rethrows on operation error", async () => {
    const thrownError = new Error("DB constraint violation");
    const operation = jest.fn().mockRejectedValue(thrownError);
    const realUser = makeUser({ isDemo: false });

    await expect(
      executeWithWriteGate(realUser, operation, { actionType: "create_product" })
    ).rejects.toThrow("DB constraint violation");

    expect(mockRollback).toHaveBeenCalledTimes(1);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test("DEMO: rolls back and rethrows on operation error", async () => {
    const thrownError = new Error("Validation error");
    const operation = jest.fn().mockRejectedValue(thrownError);
    const demoUser = makeUser({ isDemo: true });

    await expect(
      executeWithWriteGate(demoUser, operation, { actionType: "adjust_stock" })
    ).rejects.toThrow("Validation error");

    expect(mockRollback).toHaveBeenCalledTimes(1);
  });

  // ── New Relic Telemetry ───────────────────────────────────────────────────────

  test("Records write gate telemetry event on each call", async () => {
    const operation = jest.fn().mockResolvedValue({ id: "p1" });
    const demoUser = makeUser({ isDemo: true });

    await executeWithWriteGate(demoUser, operation, { actionType: "adjust_stock" });

    expect(recordWriteGateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        isDemo: true,
        actionType: "adjust_stock",
        userId: demoUser.id,
        tenantId: demoUser.tenantId,
      })
    );
  });
});

// ── Cross-user isolation scenario ─────────────────────────────────────────────
describe("WriteGate — Cross-User Result Isolation", () => {
  beforeEach(() => {
    mockRollback.mockReset().mockResolvedValue(undefined);
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockTransaction.mockReset().mockImplementation(async () => ({
      rollback: mockRollback,
      commit: mockCommit,
      finished: false,
    }));
    recordWriteGateEvent.mockReset();
    noticeError.mockReset();
  });

  test("Demo and real users receive independent, correctly-flagged results", async () => {
    const demoUser = makeUser({ id: "demo-user-1", isDemo: true, tenantId: "tenant-demo" });
    const realUser = makeUser({ id: "real-user-1", isDemo: false, tenantId: "tenant-real" });

    const demoOperation = jest.fn().mockResolvedValue({ id: "product-demo", stock: 99 });
    const realOperation = jest.fn().mockResolvedValue({ id: "product-real", stock: 55 });

    const [demoResult, realResult] = await Promise.all([
      executeWithWriteGate(demoUser, demoOperation, { actionType: "update_stock" }),
      executeWithWriteGate(realUser, realOperation, { actionType: "update_stock" }),
    ]);

    // Demo result carries simulation flags
    expect(demoResult._simulated).toBe(true);
    expect(demoResult.isDemo).toBe(true);

    // Real result has no extra flags
    expect(realResult._simulated).toBeUndefined();
    expect(realResult.isDemo).toBeUndefined();
    expect(realResult.stock).toBe(55);
  });
});
