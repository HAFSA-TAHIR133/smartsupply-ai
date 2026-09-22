"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useAuthContext } from "@/context/authContext";
import {
  DollarSign,
  Boxes,
  Briefcase,
  Bot,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const STAGE_COLORS = {
  New: "#06b6d4",       // Cyan Blue
  Contacted: "#0284c7", // Bright Sky Blue
  Qualified: "#3b82f6", // Royal Blue
  Proposal: "#6366f1", // Indigo
  Won: "#8b5cf6",       // Deep Violet / Purple
};
const STAGE_PALETTE = ["#38bdf8", "#818cf8", "#a855f7", "#f59e0b", "#10b981", "#6366f1"];

const DEFAULT_STATS = {
  inventory: {
    totalProducts: 5,
    totalStock: 820,
    totalValuation: 164000,
    lowStockCount: 2,
    criticalItems: [
      { id: "prod-demo-4", name: "Titanium Hex Bolts M8x40 (Box 50)", sku: "FST-TI-M840", current_stock: 0, min_stock_threshold: 12 },
      { id: "prod-demo-2", name: "Lithium Polymer Pack 48V 20Ah", sku: "BAT-LIPO-4820", current_stock: 6, min_stock_threshold: 10 },
    ],
  },
  crm: {
    totalLeads: 3,
    pipelineValue: 247000,
    stageDistribution: [
      { name: "New", value: 1, amount: 42000 },
      { name: "Qualified", value: 1, amount: 85000 },
      { name: "Proposal", value: 1, amount: 120000 },
      { name: "Won", value: 0, amount: 0 },
    ],
    urgentTasks: [
      { id: "task-demo-1", title: "Follow up with Marcus Vance on AeroTech quotation", due_date: "2026-09-23", status: "PENDING", priority: "HIGH" },
      { id: "task-demo-2", title: "Restock PO for Titanium Hex Bolts M8x40", due_date: "2026-09-22", status: "PENDING", priority: "HIGH" },
    ],
  },
  agents: {
    activeAgentsCount: 4,
    totalExecutions: 86,
    successRate: "99.4%",
  },
  trendData: [
    { month: "Apr", valuation: 120000, stock: 710 },
    { month: "May", valuation: 135000, stock: 760 },
    { month: "Jun", valuation: 128000, stock: 730 },
    { month: "Jul", valuation: 148000, stock: 810 },
    { month: "Aug", valuation: 154000, stock: 840 },
    { month: "Sep", valuation: 164000, stock: 820 },
  ],
};

export default function DashboardPage() {
  const { user, isDemo } = useAuthContext();
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("valuation"); // "valuation" | "pipeline"

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, isDemo]);

  const loadDashboardData = async () => {
    try {
      const data = await apiRequest("/dashboard/stats");
      if (data) {
        setStats(data);
      }
    } catch (err) {
      // Retain clean fallback state
    } finally {
      setLoading(false);
    }
  };

  const inventory = stats?.inventory || {};
  const crm = stats?.crm || {};
  const agents = stats?.agents || {};
  const trendData = stats?.trendData || [
    { month: "Apr", valuation: 120000, stock: 710 },
    { month: "May", valuation: 135000, stock: 760 },
    { month: "Jun", valuation: 128000, stock: 730 },
    { month: "Jul", valuation: 148000, stock: 810 },
    { month: "Aug", valuation: 154000, stock: 840 },
    { month: "Sep", valuation: 164000, stock: 820 },
  ];

  const stageData = crm.stageDistribution || [
    { name: "New", amount: 25000 },
    { name: "Contacted", amount: 48500 },
    { name: "Qualified", amount: 145000 },
    { name: "Proposal", amount: 75000 },
    { name: "Won", amount: 0 },
  ];

  const totalPipelineAmount = stageData.reduce(
    (acc, curr) => acc + (Number(curr.amount) || 0),
    0
  );
  const activePieData = stageData.filter((item) => (Number(item.amount) || 0) > 0);
  const displayPieData =
    activePieData.length > 0 ? activePieData : [{ name: "No Active Deals", amount: 1 }];

  return (
    <div className="space-y-6 font-sans text-zinc-100 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
            Supply Chain Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enterprise overview across inventory assets, CRM deals, and autonomous agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors">
              <Boxes className="h-3.5 w-3.5 text-zinc-400" />
              <span>Inventory</span>
            </button>
          </Link>
          <Link href="/crm">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors">
              <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
              <span>CRM Deals</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Metrics Row (4 Clean Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">Total Asset Valuation</p>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 mt-3 font-mono tracking-tight">
            ${Number(inventory.totalValuation || 164000).toLocaleString()}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+8.4% monthly valuation</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">Total Warehouse Stock</p>
            <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 mt-3 font-mono tracking-tight">
            {inventory.totalStock || 820}{" "}
            <span className="text-xs font-normal text-zinc-400 font-sans">units</span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {inventory.lowStockCount || 2} low stock
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">Pipeline Deal Value</p>
            <div className="p-1.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 mt-3 font-mono tracking-tight">
            ${Number(crm.pipelineValue || 293500).toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-400 mt-2 font-medium">
            {crm.totalLeads || 4} active enterprise opportunities
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-5 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">Autonomous Agents</p>
            <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 mt-3 font-mono tracking-tight">
            {agents.totalExecutions || 86}{" "}
            <span className="text-xs font-normal text-zinc-400 font-sans">runs</span>
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-2 font-medium">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {agents.successRate || "99.4%"} accuracy rate
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Combined Analytics Tab Card */}
        <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-800 gap-3 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Analytics Overview</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Historical asset accumulation and sales pipeline distribution</p>
            </div>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab("valuation")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "valuation"
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Valuation Trend
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "pipeline"
                    ? "bg-zinc-800 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Pipeline Distribution
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === "valuation" ? (
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }}
                    contentStyle={{
                      backgroundColor: "#121215",
                      borderColor: "#27272a",
                      borderRadius: "0.5rem",
                      color: "#f4f4f5",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
                    }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, "Valuation"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valuation"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#valGrad)"
                  />
                </AreaChart>
              ) : (
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      backgroundColor: "#121215",
                      borderColor: "#27272a",
                      borderRadius: "0.5rem",
                      color: "#f4f4f5",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    itemStyle={{ color: "#f4f4f5" }}
                    formatter={(val, name) => {
                      if (name === "No Active Deals") return ["$0", "No Active Deals"];
                      const pct =
                        totalPipelineAmount > 0
                          ? Math.round(((Number(val) || 0) / totalPipelineAmount) * 100)
                          : 0;
                      return [`$${Number(val).toLocaleString()} (${pct}%)`, name || "Amount"];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-zinc-300 font-medium ml-1 mr-3">
                        {value}
                      </span>
                    )}
                  />
                  <Pie
                    data={displayPieData}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={displayPieData.length > 1 ? 3 : 0}
                    stroke="#18181b"
                    strokeWidth={2}
                  >
                    {displayPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name || index}`}
                        fill={
                          entry.name === "No Active Deals"
                            ? "#3f3f46"
                            : (STAGE_COLORS[entry.name] || STAGE_PALETTE[index % STAGE_PALETTE.length])
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (1/3 width): Actionable Items */}
        <div className="space-y-6">
          {/* Restock Needed Card */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Restock Needed</h3>
              </div>
              <Link href="/inventory" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-2.5">
              {inventory.criticalItems && inventory.criticalItems.length > 0 ? (
                inventory.criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{item.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Stock: <span className="text-amber-400 font-mono font-medium">{item.current_stock}</span> / Min: {item.min_stock_threshold}
                      </p>
                    </div>
                    <Link href={`/inventory?adjust=${item.id}`}>
                      <button className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">
                        Restock
                      </button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">All inventory levels are healthy.</p>
              )}
            </div>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Pending Tasks</h3>
              </div>
              <Link href="/crm" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
                View CRM
              </Link>
            </div>
            <div className="space-y-2.5">
              {crm.urgentTasks && crm.urgentTasks.length > 0 ? (
                crm.urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="pr-2">
                      <p className="font-medium text-zinc-200 line-clamp-1">{task.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Due: {task.due_date}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[10px] font-medium shrink-0">
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No urgent tasks pending.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}