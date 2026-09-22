"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/authContext";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Clock,
  ShieldCheck,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login, startDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const rawRedirect = searchParams ? searchParams.get("redirect") : null;
  const reason = searchParams ? searchParams.get("reason") : null;

  // Safe redirect destination (prevent open redirects)
  const targetRedirect =
    rawRedirect &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.startsWith("/login")
      ? rawRedirect
      : "/";

  // If already authenticated and not loading, redirect to target
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(targetRedirect);
    }
  }, [user, authLoading, targetRedirect, router]);

  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError("Invalid email or password");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      router.replace(targetRedirect);
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async () => {
    setError("");
    setDemoLoading(true);
    try {
      await startDemo();
      router.replace(targetRedirect);
    } catch (err) {
      setError(err.message || "Failed to authenticate demo account. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100 selection:bg-indigo-600 selection:text-white">
      {/* Background Subtle Ambience */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <BackgroundBeams className="opacity-35" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 max-w-md w-full my-6"
      >
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 border border-indigo-500/40 text-white shadow-xs mb-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center justify-center gap-1.5">
            Smart<span className="text-indigo-400">Supply</span> AI
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enterprise Supply Chain Intelligence Platform
          </p>
        </div>

        {/* Enterprise Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative backdrop-blur-md">
          {/* Notification / Session Expiration Banner */}
          {reason === "inactivity" && (
            <div
              id="inactivity-notice"
              className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5"
            >
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Your session expired due to inactivity. Please sign in again.</span>
            </div>
          )}

          {reason === "session_expired" && (
            <div
              id="session-expired-notice"
              className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2.5"
            >
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              id="login-error-notice"
              className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form - Two Fields Only: Email and Password */}
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-medium text-zinc-300 block"
              >
                Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="name@company.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-medium text-zinc-300 block"
              >
                Password
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
                  ) : (
                    <Eye className="w-4 h-4 text-zinc-400 hover:text-zinc-200" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="submit-signin-btn"
              type="submit"
              disabled={submitting || demoLoading}
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-sm text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                or
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* Demo Account Button */}
            <button
              id="demo-account-btn"
              type="button"
              onClick={handleDemoAccess}
              disabled={submitting || demoLoading}
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Authenticating Demo Account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Demo Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Subtle Security Badge Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>Encrypted End-to-End Enterprise Session</span>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
