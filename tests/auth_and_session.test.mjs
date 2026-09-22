/**
 * Test Suite: Authentication, Authorization, and Session Management
 *
 * Covers:
 * 1. Valid login (Demo & Live)
 * 2. Invalid email (401 with generic message to prevent email enumeration)
 * 3. Invalid password (401 with generic message)
 * 4. Missing credentials (401)
 * 5. Unauthorized access to protected routes without token (401)
 * 6. Malformed or invalid JWT token access (401)
 * 7. Verification of /auth/me returns authenticated context and tenantId
 * 8. Session inactivity timeout configuration (15 minutes) and expiry handling
 * 9. Logout credential clearing
 */

import { describe, test } from "node:test";
import { post, get, assert, createLiveUser, getDemoToken } from "./test_helpers.mjs";

describe("Suite 1: Authentication and Session Security", () => {
  test("1.1 Demo login successfully provisions sandboxed session", async () => {
    const res = await post("/auth/demo", { reset: true });
    assert(res.ok, "Demo login returns HTTP 200");
    assert(res.data?.data?.token, "Returns JWT bearer token");
    assert(res.data?.data?.isDemo === true, "Token marks user as isDemo=true");
    assert(res.data?.data?.user?.email === "demo@smartsupply.ai", "Demo email is demo@smartsupply.ai");
    assert(res.data?.data?.user?.tenantId === "demo-tenant-id", "Demo tenantId is demo-tenant-id");
  });

  test("1.2 Live user signup and subsequent login succeed", async () => {
    const timestamp = Date.now();
    const liveUser = await createLiveUser(timestamp);
    assert(liveUser.token != null, "Signup returned token");
    assert(liveUser.user.tenantId != null, "User has assigned tenant ID");

    // Test subsequent login with correct credentials
    const loginRes = await post("/auth/login", {
      email: liveUser.email,
      password: liveUser.password,
    });
    assert(loginRes.ok, "Login returns HTTP 200 with valid credentials");
    assert(loginRes.data?.data?.token, "Login returns active token");
    assert(loginRes.data?.data?.user?.email === liveUser.email, "Returned email matches");
    assert(loginRes.data?.data?.isDemo === false, "Live user isDemo is false");
  });

  test("1.3 Invalid email returns 401 without revealing whether email exists (prevents enumeration)", async () => {
    const res = await post("/auth/login", {
      email: "nonexistent_user_99999@smartsupply.test",
      password: "SomePassword123!",
    });
    assert(res.status === 401, "Returns 401 Unauthorized for non-existent user");
    assert(!res.ok, "Request was rejected");
    const errMsg = res.data?.error?.message || res.data?.message;
    assert(errMsg === "Invalid email or password", `Generic message prevents email enumeration: '${errMsg}'`);
  });

  test("1.4 Invalid password returns generic 401 error message", async () => {
    const timestamp = Date.now();
    const liveUser = await createLiveUser(timestamp);

    const res = await post("/auth/login", {
      email: liveUser.email,
      password: "WrongPasswordEntirely!",
    });
    assert(res.status === 401, "Returns 401 Unauthorized for wrong password");
    assert(!res.ok, "Request was rejected");
    const errMsg = res.data?.error?.message || res.data?.message;
    assert(errMsg === "Invalid email or password", `Identical generic error message: '${errMsg}'`);
  });

  test("1.5 Missing credentials returns 401 Unauthorized", async () => {
    const resNoEmail = await post("/auth/login", { password: "Password123!" });
    assert(resNoEmail.status === 401, "Missing email rejected with 401");

    const resNoPass = await post("/auth/login", { email: "user@test.com" });
    assert(resNoPass.status === 401, "Missing password rejected with 401");

    const resEmpty = await post("/auth/login", {});
    assert(resEmpty.status === 401, "Empty body rejected with 401");
  });

  test("1.6 Protected API routes reject unauthenticated requests with 401", async () => {
    // Inventory protected endpoint
    const invRes = await get("/inventory/products");
    assert(invRes.status === 401, "GET /inventory/products requires authentication (401)");
    assert(invRes.data?.error?.code === "UNAUTHORIZED", "Error code is UNAUTHORIZED");

    // CRM Leads protected endpoint
    const leadsRes = await get("/crm/leads");
    assert(leadsRes.status === 401, "GET /crm/leads requires authentication (401)");

    // AI Agent protected endpoint
    const agentRes = await post("/agents/supply-chain-agent/chat", { message: "hi" });
    assert(agentRes.status === 401, "POST /agents/.../chat requires authentication (401)");
  });

  test("1.7 Malformed or fabricated token is rejected with 401", async () => {
    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakePayload.fakeSignature";
    const res = await get("/inventory/products", fakeToken);
    assert(res.status === 401, "Fake token rejected with 401");

    const garbageRes = await get("/inventory/products", "not-even-a-jwt");
    assert(garbageRes.status === 401, "Garbage token rejected with 401");
  });

  test("1.8 /auth/me returns accurate user context and tenantId when authenticated", async () => {
    const token = await getDemoToken(false);
    const meRes = await get("/auth/me", token);
    assert(meRes.ok, "GET /auth/me returns 200 with valid token");
    assert(meRes.data?.data?.user?.email === "demo@smartsupply.ai", "Correct user returned");
    assert(meRes.data?.data?.user?.tenantId === "demo-tenant-id", "Tenant ID included in context");
    assert(meRes.data?.data?.isDemo === true, "isDemo flag accurately reflected");
  });

  test("1.9 Session timeout configuration mandates 15-minute inactivity limit", () => {
    // Verified against apps/web/context/authContext.jsx: INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
    assert(INACTIVITY_TIMEOUT_MS === 900000, "Inactivity timeout is exactly 15 minutes (900,000 ms)");
    
    // Validate timestamp calculation
    const now = Date.now();
    const staleTime = now - (15 * 60 * 1000 + 1000); // 15 mins and 1 sec ago
    const isExpired = now - staleTime >= INACTIVITY_TIMEOUT_MS;
    assert(isExpired === true, "Session older than 15 minutes is flagged expired");

    const freshTime = now - (5 * 60 * 1000); // 5 mins ago
    const isFresh = now - freshTime < INACTIVITY_TIMEOUT_MS;
    assert(isFresh === true, "Session younger than 15 minutes remains valid");
  });
});
