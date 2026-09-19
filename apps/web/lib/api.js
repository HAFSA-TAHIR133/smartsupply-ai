const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export async function apiRequest(endpoint, options = {}) {

  const token = typeof window !== "undefined" ? localStorage.getItem("smartsupply_token") : null;
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("smartsupply_tenantId") : null;

  // Build query string from params
  let queryString = "";
  if (options.params && Object.keys(options.params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    queryString = `?${searchParams.toString()}`;
  }

  const headers = {
    ...(options.isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId ? { "x-tenant-id": tenantId } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (options.body && !options.isFormData && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}${queryString}`, config);
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("smartsupply_token");
      }
      throw new Error(data.message || data.error?.message || `HTTP Error ${res.status}`);
    }

    return data.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`API Error on [${options.method || "GET"} ${endpoint}]:`, err.message);
    throw err;
  }
}

export const authAPI = {
  login: (email, password) => apiRequest("/auth/login", { method: "POST", body: { email, password } }),
  signup: (payload) => apiRequest("/auth/signup", { method: "POST", body: payload }),
  demo: () => apiRequest("/auth/demo", { method: "POST" }),
  getMe: () => apiRequest("/auth/me"),
  forgotPassword: (email) => apiRequest("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (payload) => apiRequest("/auth/reset-password", { method: "POST", body: payload }),
};

export const inventoryAPI = {
  getAll: (params = {}) => apiRequest("/inventory", { params }),
  getById: (id) => apiRequest(`/inventory/${id}`),
  create: (payload) => {
    const mapped = {
      ...payload,
      unitPrice: payload.unit_price ?? payload.unitPrice,
      quantity: payload.current_stock ?? payload.quantity,
      reorderPoint: payload.min_stock_threshold ?? payload.reorderPoint,
    };
    return apiRequest("/inventory", { method: "POST", body: mapped });
  },
  update: (id, payload) => {
    const mapped = {
      ...payload,
      unitPrice: payload.unit_price ?? payload.unitPrice,
      quantity: payload.current_stock ?? payload.quantity,
      reorderPoint: payload.min_stock_threshold ?? payload.reorderPoint,
    };
    return apiRequest(`/inventory/${id}`, { method: "PUT", body: mapped });
  },
  adjustStock: (id, payload) => {
    const mapped = {
      ...payload,
      changeType: payload.type ?? payload.changeType,
    };
    return apiRequest(`/inventory/${id}/stock`, { method: "POST", body: mapped });
  },
  getHistory: (id) => apiRequest(`/inventory/${id}/history`),
  delete: (id) => apiRequest(`/inventory/${id}`, { method: "DELETE" }),
};

export const crmAPI = {
  getLeads: () => apiRequest("/crm/leads"),
  createLead: (payload) => apiRequest("/crm/leads", { method: "POST", body: payload }),
  updateLead: (id, payload) => apiRequest(`/crm/leads/${id}`, { method: "PUT", body: payload }),
  updateLeadStage: (id, stage) => apiRequest(`/crm/leads/${id}/stage`, { method: "PUT", body: { stage } }),
  deleteLead: (id) => apiRequest(`/crm/leads/${id}`, { method: "DELETE" }),
  getCustomers: () => apiRequest("/crm/customers"),
  getTasks: () => apiRequest("/crm/tasks"),
  createTask: (payload) => apiRequest("/crm/tasks", { method: "POST", body: payload }),
  updateTask: (id, payload) => apiRequest(`/crm/tasks/${id}`, { method: "PUT", body: payload }),
  deleteTask: (id) => apiRequest(`/crm/tasks/${id}`, { method: "DELETE" }),
};

export const documentAPI = {
  getAll: () => apiRequest("/documents"),
  upload: (formData) => apiRequest("/documents/upload", { method: "POST", body: formData, isFormData: true }),
  searchChunks: (query) => apiRequest(`/documents/search?q=${encodeURIComponent(query)}`),
  delete: (id) => apiRequest(`/documents/${id}`, { method: "DELETE" }),
};

export const agentAPI = {
  getAll: () => apiRequest("/agents"),
  updateConfig: (id, payload) => apiRequest(`/agents/${id}/config`, { method: "PUT", body: payload }),
  getExecutions: () => apiRequest("/agents/executions"),
  chat: (agentId, message, conversationId) =>
    apiRequest(`/agents/${agentId}/chat`, {
      method: "POST",
      body: { message, conversationId },
    }),
  approveAction: (actionId) =>
    apiRequest(`/agents/actions/${actionId}/approve`, {
      method: "POST",
    }),
  rejectAction: (actionId) =>
    apiRequest(`/agents/actions/${actionId}/reject`, {
      method: "POST",
    }),
};

export const conversationsAPI = {
  getAll: () => apiRequest("/conversations"),
  getMessages: (id) => apiRequest(`/conversations/${id}/messages`),
  delete: (id) => apiRequest(`/conversations/${id}`, { method: "DELETE" }),
};

export const demoAPI = {
  reset: () => apiRequest("/demo/reset", { method: "POST" }),
};

export const chartsAPI = {
  getAll: () => apiRequest("/charts"),
  create: (payload) => apiRequest("/charts", { method: "POST", body: payload }),
  delete: (id) => apiRequest(`/charts/${id}`, { method: "DELETE" }),
};


