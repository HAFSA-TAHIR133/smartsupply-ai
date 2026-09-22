"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/api";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export const AuthContext = createContext({
  user: null,
  token: null,
  isDemo: false,
  tenantId: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  startDemo: async () => {},
  loginDemo: async () => {},
  logout: () => {},
  updateUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const isLoggingOutRef = useRef(false);

  const logout = useCallback((reason) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    const wasDemo = isDemo || (typeof window !== "undefined" && localStorage.getItem("smartsupply_isDemo") === "true");
    if (wasDemo) {
      // Ephemeral Demo Account: reset demo backend on logout
      apiRequest("/demo/reset", { method: "POST" }).catch(() => {});
    }
    apiRequest("/auth/logout", { method: "POST" }).catch(() => {});

    setUser(null);
    setToken(null);
    setIsDemo(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("smartsupply_logged_out", "true");
      localStorage.removeItem("smartsupply_token");
      localStorage.removeItem("smartsupply_user");
      localStorage.removeItem("smartsupply_tenantId");
      localStorage.removeItem("smartsupply_isDemo");
      localStorage.removeItem("smartsupply_last_active");
    }

    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 1000);
  }, []);

  // Check initial session & inactivity on mount
  useEffect(() => {
    const isLoggedOut = typeof window !== "undefined" && localStorage.getItem("smartsupply_logged_out") === "true";
    if (isLoggedOut) {
      setUser(null);
      setToken(null);
      setIsDemo(false);
      setLoading(false);
      return;
    }

    const savedToken = typeof window !== "undefined" ? localStorage.getItem("smartsupply_token") : null;
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("smartsupply_user") : null;
    const savedDemo = typeof window !== "undefined" && localStorage.getItem("smartsupply_isDemo") === "true";
    const savedLastActive = typeof window !== "undefined" ? localStorage.getItem("smartsupply_last_active") : null;

    if (savedToken && savedUser) {
      // Check if session timed out while tab was closed/inactive
      if (savedLastActive) {
        const lastActiveTime = parseInt(savedLastActive, 10);
        if (!Number.isNaN(lastActiveTime) && Date.now() - lastActiveTime >= INACTIVITY_TIMEOUT_MS) {
          // Session expired due to inactivity
          logout("inactivity");
          setLoading(false);
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login?reason=inactivity";
          }
          return;
        }
      }

      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setToken(savedToken);
        setIsDemo(savedDemo);
        if (typeof window !== "undefined") {
          localStorage.setItem("smartsupply_last_active", Date.now().toString());
        }

        // Ephemeral Demo Account:
        // When the user refreshes the page, restore the original pristine demo account data
        if (savedDemo) {
          apiRequest("/demo/reset", { method: "POST" })
            .then(() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("smartsupply:data-updated"));
              }
            })
            .catch(() => {});
        }

        setLoading(false);
        return;
      } catch (e) {
        logout();
      }
    }

    // Not logged in -> set unauthenticated state (do NOT auto-login to demo)
    setUser(null);
    setToken(null);
    setIsDemo(false);
    setLoading(false);
  }, [logout]);

  // Inactivity tracking across mouse, keyboard, scroll, touch, and clicks
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    let lastWrite = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastWrite > 2000) {
        lastWrite = now;
        localStorage.setItem("smartsupply_last_active", now.toString());
      }
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleActivity, { passive: true });
    });

    // Check inactivity every 5 seconds
    const interval = setInterval(() => {
      const lastActiveStr = localStorage.getItem("smartsupply_last_active");
      if (!lastActiveStr) return;
      const lastActiveTime = parseInt(lastActiveStr, 10);
      if (Number.isNaN(lastActiveTime)) return;

      if (Date.now() - lastActiveTime >= INACTIVITY_TIMEOUT_MS) {
        logout("inactivity");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?reason=inactivity";
        }
      }
    }, 5000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
      clearInterval(interval);
    };
  }, [user, logout]);

  const login = async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if (!data?.token || !data?.user) {
      throw new Error("Invalid email or password");
    }

    setUser(data.user);
    setToken(data.token);
    setIsDemo(Boolean(data.isDemo));

    localStorage.removeItem("smartsupply_logged_out");
    localStorage.setItem("smartsupply_token", data.token);
    localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
    localStorage.setItem("smartsupply_tenantId", data.user.tenantId || "");
    localStorage.setItem("smartsupply_isDemo", String(Boolean(data.isDemo)));
    localStorage.setItem("smartsupply_last_active", Date.now().toString());
    return data;
  };

  const signup = async (email, password, name, organizationName) => {
    const data = await apiRequest("/auth/signup", {
      method: "POST",
      body: { email, password, name, organizationName },
    });

    setUser(data.user);
    setToken(data.token);
    setIsDemo(false);

    localStorage.removeItem("smartsupply_logged_out");
    localStorage.setItem("smartsupply_token", data.token);
    localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
    localStorage.setItem("smartsupply_tenantId", data.user.tenantId || "");
    localStorage.setItem("smartsupply_isDemo", "false");
    localStorage.setItem("smartsupply_last_active", Date.now().toString());
    return data;
  };

  const startDemo = async () => {
    // Authenticate through normal backend flow
    const data = await apiRequest("/auth/demo", { method: "POST" });
    if (!data?.token || !data?.user) {
      throw new Error("Failed to authenticate demo account.");
    }

    setUser(data.user);
    setToken(data.token);
    setIsDemo(true);

    localStorage.removeItem("smartsupply_logged_out");
    localStorage.setItem("smartsupply_token", data.token);
    localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
    localStorage.setItem("smartsupply_tenantId", data.user.tenantId || "demo-tenant-id");
    localStorage.setItem("smartsupply_isDemo", "true");
    localStorage.setItem("smartsupply_last_active", Date.now().toString());
    return data;
  };

  const updateUser = async (updatedFields) => {
    const updated = { ...user, ...updatedFields };
    setUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartsupply_user", JSON.stringify(updated));
    }
    try {
      await apiRequest("/auth/profile", {
        method: "PUT",
        body: updatedFields,
      });
    } catch (e) {
      console.warn("Failed to persist profile updates to backend:", e);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isDemo,
        tenantId: user?.tenantId,
        loading,
        login,
        signup,
        startDemo,
        loginDemo: startDemo,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
export const useAuth = () => useContext(AuthContext);