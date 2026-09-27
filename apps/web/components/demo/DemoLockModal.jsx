"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, ExternalLink, ShieldAlert, Award } from "lucide-react";
import { getAiCommandCount, DEMO_MAX_AI_ACTIONS } from "@/lib/demo/demoStore";

const LINKEDIN_PROFILE_URL = "https://www.linkedin.com/in/hafsa-tahir-dev";

export function DemoLockModal() {
  const [isLocked, setIsLocked] = useState(false);

  const checkStatus = () => {
    if (typeof window === "undefined") return;
    const isDemo =
      localStorage.getItem("smartsupply_isDemo") === "true" ||
      (localStorage.getItem("smartsupply_user") || "").includes("demo@smartsupply.ai");

    if (isDemo && getAiCommandCount() >= DEMO_MAX_AI_ACTIONS) {
      setIsLocked(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsLocked(false);
      document.body.style.overflow = "";
    }
  };

  useEffect(() => {
    checkStatus();

    const handleUpdate = () => checkStatus();
    window.addEventListener("smartsupply:data-updated", handleUpdate);
    window.addEventListener("smartsupply:demo-locked", handleUpdate);

    return () => {
      window.removeEventListener("smartsupply:data-updated", handleUpdate);
      window.removeEventListener("smartsupply:demo-locked", handleUpdate);
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  if (!isLocked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-lock-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0A66C2]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Lock Card (Un-dismissable) */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800/90 bg-zinc-900/95 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl text-center space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Border */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-[#0A66C2] to-transparent" />

        {/* Header Icon / Badge */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-[#0A66C2] via-indigo-500 to-cyan-400 opacity-70 blur-md animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-zinc-950 border border-indigo-400/40 flex items-center justify-center shadow-xl">
            <span className="text-3xl" role="img" aria-label="Rocket">
              🚀
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A66C2]/15 border border-[#0A66C2]/30 text-[#388fd8] text-xs font-semibold tracking-wide">
            <Award className="w-3.5 h-3.5" />
            <span>Trial Completed • 10/10 AI Actions</span>
          </div>

          <h2
            id="demo-lock-title"
            className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight"
          >
            🚀 Demo Limit Reached!
          </h2>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-md mx-auto font-normal">
            You&apos;ve successfully tested the core capabilities of SmartSupply AI. Ready to transform your business operations with custom AI automation? Let&apos;s discuss your specific needs!
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 gap-2 text-left p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-[11px] text-zinc-300">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Autonomous Agent Workflows</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Live PostgreSQL / ERP Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Custom LLM Fine-Tuning</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Multi-Tenant Architecture</span>
          </div>
        </div>

        {/* Action Button: LinkedIn Official Brand Button */}
        <div className="pt-2">
          <a
            id="linkedin-redirect-btn"
            href={LINKEDIN_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-[#0A66C2] hover:bg-[#004182] active:scale-[0.99] transition-all shadow-[0_0_30px_rgba(10,102,194,0.45)] hover:shadow-[0_0_40px_rgba(10,102,194,0.65)] cursor-pointer"
          >
            {/* LinkedIn Logo Icon */}
            <svg
              className="w-4 h-4 fill-current shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            <span>Connect on LinkedIn</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-[10px] text-zinc-500 font-medium">
          Built by <span className="text-zinc-300 font-semibold">Hafsa Tahir</span> • Full-Stack AI Engineer
        </p>
      </div>
    </div>
  );
}
