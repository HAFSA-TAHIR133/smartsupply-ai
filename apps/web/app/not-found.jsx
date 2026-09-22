"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Home, LogIn, Compass, Sparkles } from "lucide-react";
import { useAuth } from "@/context/authContext";
import { BackgroundBeams } from "@/components/aceternity/background-beams";

export default function NotFound() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(user ? "/" : "/login");
    }
  };

  return (
    <div
      id="not-found-container"
      className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100 selection:bg-indigo-600 selection:text-white"
    >
      {/* Subtle background ambience */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <BackgroundBeams className="opacity-25" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 max-w-md w-full text-center"
      >
        {/* Header Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-indigo-400 shadow-xl mb-6">
          <Compass className="w-7 h-7 stroke-[1.75]" />
        </div>

        {/* 404 Badge */}
        <div className="mb-3">
          <span
            id="not-found-status-badge"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            404 Error
          </span>
        </div>

        {/* Title & Description */}
        <h1
          id="not-found-title"
          className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 mb-2"
        >
          Page Not Found
        </h1>
        <p
          id="not-found-desc"
          className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mb-8 leading-relaxed"
        >
          The resource or page you requested could not be located. It may have been moved, renamed, or is temporarily unavailable.
        </p>

        {/* Navigation Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="not-found-back-btn"
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
            <span>Go Back</span>
          </button>

          {user ? (
            <Link
              id="not-found-dashboard-link"
              href="/"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          ) : (
            <Link
              id="not-found-signin-link"
              href="/login"
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Sign In</span>
            </Link>
          )}
        </div>

        {/* Bottom subtle logo */}
        <div className="mt-12 flex items-center justify-center gap-2 text-zinc-500 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400/70" />
          <span>SmartSupply AI Workspace</span>
        </div>
      </motion.div>
    </div>
  );
}
