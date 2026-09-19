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
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  const handleSignIn = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(
        err.message || "Invalid credentials. Please verify your email and password."
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
      setForgotMsg(res.message || "Reset token generated. Check your email or enter OTP.");
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
      await authAPI.resetPassword({ token: otpToken, new_password: newPassword });
      setForgotMsg("Password reset successfully! Redirecting...");
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setEmail(forgotEmail);
        setPassword(newPassword);
      }, 1200);
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
          
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-4">
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
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-neutral-950/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/80 focus:bg-neutral-950/70 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white transition-all shadow-lg shadow-indigo-600/30 text-xs flex items-center justify-center gap-2 mt-2 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
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
          </form>
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
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
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