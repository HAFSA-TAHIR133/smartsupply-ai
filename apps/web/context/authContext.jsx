"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";

export const AuthContext = createContext({
  user: null,
  token: null,
  isDemo: false,
  tenantId: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  startDemo: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on load
    const savedToken = localStorage.getItem("smartsupply_token");
    const savedUser = localStorage.getItem("smartsupply_user");
    const savedDemo = localStorage.getItem("smartsupply_isDemo") === "true";

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setToken(savedToken);
        setIsDemo(savedDemo);
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setUser(data.user);
    setToken(data.token);
    setIsDemo(false);

    localStorage.setItem("smartsupply_token", data.token);
    localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
    localStorage.setItem("smartsupply_tenantId", data.user.tenantId);
    localStorage.setItem("smartsupply_isDemo", "false");
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

    localStorage.setItem("smartsupply_token", data.token);
    localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
    localStorage.setItem("smartsupply_tenantId", data.user.tenantId);
    localStorage.setItem("smartsupply_isDemo", "false");
    return data;
  };

  const startDemo = async () => {
    try {
      const data = await apiRequest("/auth/demo", { method: "POST" });
      setUser(data.user);
      setToken(data.token);
      setIsDemo(true);

      localStorage.setItem("smartsupply_token", data.token);
      localStorage.setItem("smartsupply_user", JSON.stringify(data.user));
      localStorage.setItem("smartsupply_tenantId", data.user.tenantId);
      localStorage.setItem("smartsupply_isDemo", "true");
    } catch (err) {
      // Offline / immediate demo fallback
      const fallbackUser = {
        id: "demo-user-1",
        name: "Demo Manager",
        email: "demo@smartsupply.ai",
        role: "ADMIN",
        tenantId: "3e6c5a8e-f131-4902-8d80-1c9056f858d4",
        tenantName: "Acme Logistics Global (Demo)",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop",
      };
      setUser(fallbackUser);
      setIsDemo(true);
      localStorage.setItem("smartsupply_user", JSON.stringify(fallbackUser));
      localStorage.setItem("smartsupply_tenantId", fallbackUser.tenantId);
      localStorage.setItem("smartsupply_isDemo", "true");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsDemo(false);
    localStorage.removeItem("smartsupply_token");
    localStorage.removeItem("smartsupply_user");
    localStorage.removeItem("smartsupply_tenantId");
    localStorage.removeItem("smartsupply_isDemo");
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
export const useAuth = () => useContext(AuthContext);