/**
 * Shared Test Helpers and Fixtures for SmartSupply AI Test Suites
 */

export const API_BASE = process.env.API_BASE || "http://localhost:3000/api/v1";

export async function post(endpoint, body = {}, token = null) {
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

export async function get(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function put(endpoint, body = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function del(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "DELETE",
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export async function getDemoToken(reset = true) {
  const res = await post("/auth/demo", { reset });
  if (!res.ok || !res.data?.data?.token) {
    throw new Error("Failed to authenticate as demo user");
  }
  return res.data.data.token;
}

export async function createLiveUser(suffix = Date.now()) {
  const email = `testuser_${suffix}@smartsupply.test`;
  const password = `Pass_${suffix}_Secure!`;
  const name = `Test User ${suffix}`;
  const organizationName = `Org ${suffix} Corp`;

  const res = await post("/auth/signup", {
    email,
    password,
    name,
    organizationName,
  });

  if (!res.ok) {
    throw new Error(`Failed to create live user: ${JSON.stringify(res.data)}`);
  }

  return {
    email,
    password,
    name,
    organizationName,
    token: res.data.data.token,
    user: res.data.data.user,
  };
}
