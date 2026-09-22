"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/authContext";
import { authAPI } from "@/lib/api";
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
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const rawRedirect = searchParams ? searchParams.get("redirect") : null;
  const reason = searchParams ? searchParams.get("reason") : null;

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

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
    if (lockoutSeconds > 0) return;

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
      if (err.remainingSeconds) {
        setLockoutSeconds(err.remainingSeconds);
      } else if (err.lockedUntil) {
        const diff = Math.max(1, Math.ceil((err.lockedUntil - Date.now()) / 1000));
        setLockoutSeconds(diff);
      } else if (err.status === 429 || (err.message && err.message.toLowerCase().includes("15 minutes"))) {
        setLockoutSeconds(15 * 60);
      }
      setError(err.message || "Invalid email or password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!email || !email.includes("@")) return;
    try {
      const res = await authAPI.checkLockout(email.trim());
      if (res?.isLocked && res?.remainingSeconds) {
        setLockoutSeconds(res.remainingSeconds);
      }
    } catch {
      // Ignore background check errors
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
      {/* Background Subtle Ambience & Dynamic Growing Circles */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <BackgroundBeams className="opacity-40" />

        {/* Ambient Growing and Pulsing Circles */}
        {/* Circle 1: Top Left Glowing Radial Orb */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.3 }}
          animate={{
            scale: [0.8, 1.4, 0.8],
            opacity: [0.25, 0.55, 0.25],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl"
        />

        {/* Circle 2: Bottom Right Violet Growing Orb */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0.25 }}
          animate={{
            scale: [0.9, 1.5, 0.9],
            opacity: [0.2, 0.5, 0.2],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            delay: 1.5,
            ease: "easeInOut",
          }}
          className="absolute -bottom-28 -right-28 w-[420px] h-[420px] rounded-full bg-purple-600/20 blur-3xl"
        />

        {/* Circle 3: Center Cyan Ambient Pulse */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0.15 }}
          animate={{
            scale: [0.7, 1.35, 0.7],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: 3,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px]"
        />

        {/* Circle 4: Mid-Right Floating Sky Blue Orb */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0.2 }}
          animate={{
            scale: [0.85, 1.45, 0.85],
            opacity: [0.2, 0.45, 0.2],
            y: [0, -35, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            delay: 2,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 right-10 w-72 h-72 rounded-full bg-sky-500/15 blur-2xl"
        />

        {/* Circle 5: Mid-Left Deep Indigo Expanding Circle */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0.2 }}
          animate={{
            scale: [0.75, 1.3, 0.75],
            opacity: [0.15, 0.45, 0.15],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            delay: 4,
            ease: "easeInOut",
          }}
          className="absolute bottom-1/3 left-12 w-80 h-80 rounded-full bg-indigo-500/15 blur-2xl"
        />

        {/* Geometric Expanding Concentric Radar Rings (Centered) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Ring 1 */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{
              scale: [0.5, 1.6, 2.4],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-indigo-500/30"
          />
          {/* Ring 2 (Staggered) */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{
              scale: [0.5, 1.6, 2.4],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: 2,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-purple-500/25"
          />
          {/* Ring 3 (Staggered) */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.4 }}
            animate={{
              scale: [0.5, 1.6, 2.4],
              opacity: [0.4, 0.2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: 4,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-cyan-500/20"
          />

          {/* Additional Floating Rings: Top Right */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0.2 }}
            animate={{
              scale: [0.7, 1.3, 0.7],
              opacity: [0.15, 0.35, 0.15],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -top-96 right-32 w-64 h-64 rounded-full border border-dashed border-indigo-400/25"
          />

          {/* Additional Floating Rings: Bottom Left */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.2 }}
            animate={{
              scale: [0.8, 1.35, 0.8],
              opacity: [0.15, 0.35, 0.15],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-48 -left-96 w-72 h-72 rounded-full border border-dashed border-purple-400/20"
          />
        </div>
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
          {error && lockoutSeconds <= 0 && (
            <div
              id="login-error-notice"
              className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Security Lockout Banner (10 failed attempts -> 15 min wait) */}
          {lockoutSeconds > 0 && (
            <div
              id="account-lockout-notice"
              className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-2.5 shadow-inner"
            >
              <div className="flex items-center gap-2 font-medium text-rose-300">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Account Temporarily Locked (10 Failed Attempts)</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Too many failed login attempts. For security, please wait 15 minutes before trying again.
              </p>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" />
                  Remaining wait time:
                </span>
                <span className="font-mono text-xs font-semibold text-rose-300">
                  {Math.floor(lockoutSeconds / 60)}:{(lockoutSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
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
                  onBlur={handleEmailBlur}
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
              disabled={submitting || demoLoading || lockoutSeconds > 0}
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-sm text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <>
                  <Lock className="w-4 h-4 text-rose-300" />
                  <span>
                    Locked ({Math.floor(lockoutSeconds / 60)}:{(lockoutSeconds % 60).toString().padStart(2, "0")})
                  </span>
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
