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
      } else if (
        err.status === 429 ||
        (err.message && err.message.toLowerCase().includes("15 minutes"))
      ) {
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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 font-sans text-zinc-100 selection:bg-indigo-600 selection:text-white overflow-hidden">
      {/* Background Ambience & Enhanced Glowing Orbs */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <BackgroundBeams className="opacity-50" />

        {/* Orb 1: Top-Left Indigo Radial Super-Glow */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0.4 }}
          animate={{
            scale: [0.9, 1.6, 0.9],
            opacity: [0.35, 0.7, 0.35],
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/30 blur-[130px]"
        />

        {/* Orb 2: Bottom-Right Violet Deep Glow */}
        <motion.div
          initial={{ scale: 1, opacity: 0.35 }}
          animate={{
            scale: [1, 1.7, 1],
            opacity: [0.3, 0.65, 0.3],
            x: [0, -50, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            delay: 1,
            ease: "easeInOut",
          }}
          className="absolute -bottom-36 -right-36 w-[550px] h-[550px] rounded-full bg-purple-600/30 blur-[140px]"
        />

        {/* Orb 3: Center Pulsing Core Cyan Ambient */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0.25 }}
          animate={{
            scale: [0.8, 1.5, 0.8],
            opacity: [0.25, 0.55, 0.25],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            delay: 2,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/20 blur-[150px]"
        />

        {/* Orb 4: Mid-Right Floating Vibrant Sky Blue Glow */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0.3 }}
          animate={{
            scale: [0.85, 1.5, 0.85],
            opacity: [0.25, 0.6, 0.25],
            y: [0, -45, 0],
            x: [0, -20, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            delay: 1.5,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 -right-12 w-96 h-96 rounded-full bg-sky-500/25 blur-[110px]"
        />

        {/* Orb 5: Mid-Left Deep Indigo Circle */}
        <motion.div
          initial={{ scale: 0.75, opacity: 0.3 }}
          animate={{
            scale: [0.75, 1.4, 0.75],
            opacity: [0.2, 0.55, 0.2],
            y: [0, 45, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            delay: 3,
            ease: "easeInOut",
          }}
          className="absolute bottom-1/4 -left-12 w-96 h-96 rounded-full bg-indigo-500/25 blur-[110px]"
        />

        {/* Orb 6: Top Right Accent Warm Amber Spot */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0.2 }}
          animate={{
            scale: [0.7, 1.3, 0.7],
            opacity: [0.15, 0.4, 0.15],
            x: [0, -30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            delay: 4,
            ease: "easeInOut",
          }}
          className="absolute -top-10 right-1/3 w-80 h-80 rounded-full bg-amber-500/20 blur-[100px]"
        />

        {/* Orb 7: Bottom Center Soft Emerald Flash */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0.15 }}
          animate={{
            scale: [0.6, 1.25, 0.6],
            opacity: [0.1, 0.35, 0.1],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            delay: 2.5,
            ease: "easeInOut",
          }}
          className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-emerald-500/15 blur-[120px]"
        />

        {/* Geometric Expanding Radar Rings (Centered Behind Form) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Ring 1 */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{
              scale: [0.4, 1.8, 2.8],
              opacity: [0.6, 0.2, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
          />
          {/* Ring 2 */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{
              scale: [0.4, 1.8, 2.8],
              opacity: [0.6, 0.2, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              delay: 2.3,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-purple-400/35 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          />
          {/* Ring 3 */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0.6 }}
            animate={{
              scale: [0.4, 1.8, 2.8],
              opacity: [0.6, 0.2, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              delay: 4.6,
              ease: "easeOut",
            }}
            className="absolute -top-48 -left-48 w-96 h-96 rounded-full border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          />

          {/* Rotating Dashed Floating Rings */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.25 }}
            animate={{
              scale: [0.8, 1.4, 0.8],
              opacity: [0.2, 0.45, 0.2],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -top-96 right-20 w-80 h-80 rounded-full border-2 border-dashed border-indigo-400/30"
          />

          <motion.div
            initial={{ scale: 0.85, opacity: 0.2 }}
            animate={{
              scale: [0.85, 1.45, 0.85],
              opacity: [0.15, 0.4, 0.15],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-28 -left-96 w-88 h-88 rounded-full border border-dashed border-purple-400/25"
          />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative z-10 max-w-md w-full my-6"
      >
        {/* Header Branding with Glowing Charm Logo */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center mb-3 group">
            {/* Logo Outer Radiant Glowing Halo */}
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 blur-lg opacity-70 group-hover:opacity-100 animate-pulse transition-all duration-700" />
            
            {/* Secondary Inner Ring Light */}
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-400 to-cyan-400 opacity-80 blur-xs" />

            {/* Glowing Icon Container Box */}
            <div className="relative w-12 h-12 rounded-xl bg-zinc-950 border border-indigo-400/50 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.5)]">
              <Sparkles className="w-6 h-6 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.9)] animate-spin-slow" />
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent drop-shadow-xs">
              Smart
            </span>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(129,140,248,0.6)]">
              Supply
            </span>
            
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium tracking-wide">
            Enterprise Supply Chain Intelligence Platform
          </p>
        </div>

        {/* Enterprise Glassmorphism Card */}
        <div className="bg-zinc-900/85 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative backdrop-blur-xl">
          {/* Top Subtle Border Accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

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

          {/* Security Lockout Banner */}
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
                  {Math.floor(lockoutSeconds / 60)}:
                  {(lockoutSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          )}

          {/* Sign In Form */}
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
                  className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner"
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
                  className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40 transition-all shadow-inner"
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
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:from-indigo-700 active:to-indigo-600 text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.35)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                    Locked ({Math.floor(lockoutSeconds / 60)}:
                    {(lockoutSeconds % 60).toString().padStart(2, "0")})
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
              className="w-full py-2.5 px-4 rounded-lg font-medium bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs hover:border-zinc-600"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Authenticating Demo Account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                  <span>Demo Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Badge Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400/80" />
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