"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDemoStore } from "@/lib/demo/demoStore";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * Route handler / entry point for /demo
 * Bypasses authentication guards, initializes `smartsupply_demo_db_v1`
 * with static baseline dummy data (customers, products, and metrics),
 * and instantly mounts the workspace without network fetch.
 */
export default function DemoPageHandler() {
  const router = useRouter();

  useEffect(() => {
    try {
      // 1. Initialize local browser storage with baseline dummy data
      getDemoStore();

      // 2. Set client session parameters locally
      localStorage.removeItem("smartsupply_logged_out");
      localStorage.setItem("smartsupply_isDemo", "true");
      localStorage.setItem(
        "smartsupply_user",
        JSON.stringify({
          id: "demo-user-1",
          email: "demo@smartsupply.ai",
          name: "Alex Reynolds",
          fullName: "Alex Reynolds",
          role: "ADMIN",
          tenantId: "demo-tenant-id",
          tenantName: "SmartSupply Demo Sandbox",
        })
      );
      localStorage.setItem("smartsupply_token", `demo-session-token-${Date.now()}`);
      localStorage.setItem("smartsupply_tenantId", "demo-tenant-id");
      localStorage.setItem("smartsupply_last_active", Date.now().toString());

      // Notify context
      window.dispatchEvent(
        new CustomEvent("smartsupply:data-updated", {
          detail: { source: "demoInit", timestamp: Date.now() },
        })
      );

      // 3. Instantly mount the workspace layout without network roundtrip
      router.replace("/");
    } catch (e) {
      console.warn("Error bootstrapping demo session:", e);
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 blur-lg opacity-80 animate-pulse" />
          <div className="relative w-14 h-14 rounded-2xl bg-zinc-900 border border-indigo-400/50 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-7 h-7 text-indigo-300 animate-spin-slow" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Mounting SmartSupply Demo Workspace
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Zero-backend mock state initialized. Redirecting...
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-indigo-400 mt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Instant client launch...</span>
        </div>
      </div>
    </div>
  );
}
