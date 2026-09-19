"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/authContext";
import Modal from "@/components/ui/modal";
import { authAPI } from "@/lib/api";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Building,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, signup, startDemo } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  const handleDemoAccess = async () => {
    setError("");
    setDemoLoading(true);
    try {
      await startDemo();
      router.push("/");
    } catch (err) {
      router.push("/");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (isSignUp && !fullName) {
      setError("Please enter your full name.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await signup(email, password, fullName, orgName);
      } else {
        await login(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(
        err.message || "Authentication failed. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg("");
    try {
      const res = await authAPI.forgotPassword(forgotEmail);
      setForgotStep(2);
      if (res.token) {
        setOtpToken(res.token);
      }
      setForgotMsg(res.message || "Reset token generated. Enter the OTP code below.");
    } catch (err) {
      setForgotMsg(err.message || "Failed to initiate password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await authAPI.resetPassword({ token: otpToken, new_password: newPassword, email: forgotEmail });
      setForgotMsg("Password reset successfully! Logging you in...");
      setTimeout(async () => {
        setForgotOpen(false);
        setForgotStep(1);
        setEmail(forgotEmail);
        setPassword(newPassword);
        try {
          await login(forgotEmail, newPassword);
          router.push("/");
        } catch (e) {}
      }, 1000);
    } catch (err) {
      setForgotMsg(err.message || "Failed to reset password. Invalid or expired OTP.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-neutral-950 p-4 font-sans text-neutral-100 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Full screen Background Beams Container */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <BackgroundBeams className="opacity-90" />
      </div>

      {/* Radial Glow Accent for center depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none z-0" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="relative z-10 max-w-md w-full my-6"
      >
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 shadow-lg shadow-indigo-500/30 mb-3 ring-1 ring-white/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            Smart<span className="text-indigo-400">Supply</span> AI
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Autonomous Enterprise Supply Chain Platform
          </p>
        </div>

        {/* Translucent Glass Card with Glowing Border */}
        <div className="bg-neutral-900/40 border border-indigo-500/30 rounded-2xl p-7 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.15)] relative group transition-all duration-300 hover:border-indigo-400/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]">
          
          {/* Auth Mode Switcher */}
          <div className="flex rounded-xl bg-neutral-950/70 p-1 border border-white/10 mb-5">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(""); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                !isSignUp
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(""); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isSignUp
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                    <input
                      type="text"
                      required={isSignUp}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/80 focus:bg-neutral-950/70 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    Organization / Company Name (Optional)
                  </label>
                  <div className="relative group">
                    <Building className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Apex Logistics Ltd"
                      className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/80 focus:bg-neutral-950/70 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 block">
                Work Email
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/80 focus:bg-neutral-950/70 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-neutral-300">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotOpen(true);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/80 focus:bg-neutral-950/70 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none p-1 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                  ) : (
                    <Eye className="w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-2.5 px-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-600/30 text-xs flex items-center justify-center gap-2 mt-2 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? "Creating Account..." : "Signing in..."}</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? "Create Enterprise Account" : "Sign In to Enterprise"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">or</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={handleDemoAccess}
              disabled={loading || demoLoading}
              className="w-full py-2.5 px-4 rounded-xl font-medium bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white transition-all text-xs flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
            >
              {demoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Launching Sandbox...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Explore Demo Sandbox (Instant Access)</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Fillers */}
          <div className="mt-5 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex flex-col gap-1.5">
            <span className="text-zinc-500 font-medium">Quick Credentials:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setEmail("heerc838@gmail.com");
                }}
                className="px-2.5 py-1 rounded-md bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 hover:text-white border border-indigo-700/60 transition-colors font-mono text-[10px]"
              >
                Account: heerc838@gmail.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setEmail("admin@smartsupply.ai");
                  setPassword("admin123");
                }}
                className="px-2.5 py-1 rounded-md bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors font-mono text-[10px]"
              >
                Live Enterprise: admin@smartsupply.ai
              </button>
              <button
                type="button"
                onClick={handleDemoAccess}
                className="px-2.5 py-1 rounded-md bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition-colors font-mono text-[10px]"
              >
                Demo: Alex Reynolds (1-Click)
              </button>
            </div>
          </div>
        </div>

       
      </motion.div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset Password"
        maxWidth="max-w-md"
      >
        {forgotStep === 1 ? (
          <form onSubmit={handleForgotRequest} className="space-y-4">
            <p className="text-xs text-neutral-400">
              Enter your account email to receive a password reset token.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300 block">
                Work Email
              </label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {forgotMsg && (
              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
                {forgotMsg}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {forgotLoading ? "Sending..." : "Send Reset OTP"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotReset} className="space-y-4">
            <p className="text-xs text-neutral-400">
              Enter the reset token sent to your email and your new password.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300 block">
                Reset Token / OTP
              </label>
              <input
                type="text"
                required
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                placeholder="Paste code here"
                className="w-full px-3 py-2 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-300 block">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 pr-10 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 transition-colors focus:outline-none p-0.5 cursor-pointer"
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>
              </div>
            </div>
            {forgotMsg && (
              <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
                {forgotMsg}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotStep(1)}
                className="px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 hover:bg-neutral-900 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={forgotLoading}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {forgotLoading ? "Updating..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}