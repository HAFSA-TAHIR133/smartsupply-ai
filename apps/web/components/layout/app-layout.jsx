"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Boxes,
  Users,
  Bell,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronDown,
  Building2,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { useAuthContext } from "@/context/authContext";
import { AIAssistantDrawer } from "@/components/ai/ai-assistant-drawer";
import { apiRequest } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/charts", label: "Charts", icon: BarChart3 },
  { href: "/crm", label: "Lead", icon: Users },
];

export function AppLayout({ children }) {
  const { user, isDemo, logout, loading } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await apiRequest("/notifications");
      setNotifications(data || []);
    } catch (e) {
      // Quiet fallback
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = async () => {
    try {
      await apiRequest("/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  if (pathname === "/login") {
    return children;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-zinc-400 font-medium tracking-wide">
            Loading SmartSupply Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-all"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 transition-all"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* App Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors">
              SmartSupply
            </span>
          </Link>

          {/* Tenant Badge */}
          {/* <div className="hidden sm:flex items-center gap-2 pl-3 ml-1 border-l border-zinc-800 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              <Building2 className="h-3 w-3 text-indigo-400" />
              <span className="font-medium text-[11px] truncate max-w-[130px]">
                {user?.tenantName || "Demo Store"}
              </span>
            </div>
          </div> */}
        </div>

        {/* Center System Status */}
        <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-zinc-400 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800/60">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-300">Operational</span>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs);
                setShowUserMenu(false);
              }}
              className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 transition-all"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-zinc-950" />
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80 mb-2">
                  <span className="text-xs font-semibold text-zinc-200">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center font-normal">
                      No unread notifications right now.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg text-xs transition-colors ${
                          n.isRead
                            ? "bg-zinc-950/40 text-zinc-400 border border-transparent"
                            : "bg-zinc-800/60 text-zinc-200 border border-zinc-700/50"
                        }`}
                      >
                        <p className="font-medium text-zinc-200">{n.title}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifs(false);
              }}
              className="flex items-center gap-2.5 p-1 pl-1.5 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
            >
              <div className="h-7 w-7 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-100 font-semibold text-xs shadow-inner">
                {user?.name?.[0] || "A"}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-medium text-zinc-200 leading-tight">
                  {user?.name || "Alex Reynolds"}
                </span>
                <span className="text-[10px] text-zinc-500">Workspace Admin</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-500 hidden sm:block ml-0.5" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
                  <p className="text-xs font-semibold text-zinc-100 truncate">
                    {user?.name || "Alex Reynolds"}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {user?.email || "alex@demostore.com"}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col border-r border-zinc-800/80 bg-zinc-950 transition-all duration-300 ease-in-out ${
            sidebarOpen ? "w-56" : "w-16"
          }`}
        >
          <div className="flex-1 p-2 space-y-1.5">
            {sidebarOpen && (
              <div className="px-3 py-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Navigation
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-zinc-800/90 text-white font-semibold shadow-sm border border-zinc-700/60"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  />
                  {sidebarOpen && <span>{item.label}</span>}
                  
                  {/* Active Indicator Pill */}
                  {isActive && sidebarOpen && (
                    <motion.div
                      layoutId="activePill"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Info Block when expanded */}
          {sidebarOpen && (
            <div className="m-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Connected</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Real-time syncing enabled.
              </p>
            </div>
          )}
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-60 bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col justify-between shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        S
                      </div>
                      <span className="font-semibold text-sm text-zinc-100">SmartSupply</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Menu
                    </div>
                    {NAV_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          pathname === item.href
                            ? "bg-zinc-800 text-white font-semibold border border-zinc-700/60"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${pathname === item.href ? "text-indigo-400" : "text-zinc-400"}`} />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Floating AI Assistant Trigger */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setAiDrawerOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-100 rounded-full shadow-2xl transition-all text-xs font-medium active:scale-95"
        >
          <Sparkles className="h-4 w-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
          <span>AI Assistant</span>
        </button>
      </div>

      {/* Slide-Over AI Drawer */}
      <AIAssistantDrawer isOpen={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  );
}