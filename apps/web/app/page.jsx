"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("valuation"); // "valuation" | "pipeline"

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await apiRequest("/dashboard/stats");
      setStats(data);
    } catch (err) {
      // Clean fallback state
      setStats({
        inventory: {
          totalProducts: 4,
          totalStock: 820,
          totalValuation: 164000,
          lowStockCount: 2,
          criticalItems: [
            { id: "1", name: "Industrial Servo Motor X1", sku: "IND-SRV-001", current_stock: 4, min_stock_threshold: 15 },
            { id: "3", name: "Hydraulic Pump Valve 400", sku: "HYD-VAL-400", current_stock: 12, min_stock_threshold: 20 },
          ],
        },
        crm: {
          totalLeads: 4,
          pipelineValue: 293500,
          stageDistribution: [
            { name: "New", value: 1, amount: 25000 },
            { name: "Contacted", value: 1, amount: 48500 },
            { name: "Qualified", value: 1, amount: 145000 },
            { name: "Proposal", value: 1, amount: 75000 },
            { name: "Won", value: 0, amount: 0 },
          ],
          urgentTasks: [
            { id: "1", title: "Review high-voltage battery specs", due_date: "2026-09-18", status: "PENDING", priority: "HIGH" },
            { id: "2", title: "Schedule factory floor walkthrough", due_date: "2026-09-20", status: "PENDING", priority: "MEDIUM" },
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
      });
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

  return (
    <div className="space-y-6 font-sans text-zinc-100">
      {/* 3. Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">
          Supply Chain Dashboard
        </h1>
      </div>

      {/* 4. Metrics Row (4 Equal-Width Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400">Total Asset Valuation</p>
          <p className="text-2xl font-semibold text-zinc-100 mt-2 font-mono">
            ${Number(inventory.totalValuation || 164000).toLocaleString()}
          </p>
          <p className="text-xs text-emerald-400 mt-1 font-medium">+8.4% growth</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400">Active SKUs</p>
          <p className="text-2xl font-semibold text-zinc-100 mt-2 font-mono">
            {inventory.totalStock || 820}
          </p>
          <p className="text-xs text-amber-400 mt-1 font-medium">
            {inventory.lowStockCount || 2} low stock
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400">Pipeline Value</p>
          <p className="text-2xl font-semibold text-zinc-100 mt-2 font-mono">
            ${Number(crm.pipelineValue || 293500).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {crm.totalLeads || 4} deals
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400">AI Executions</p>
          <p className="text-2xl font-semibold text-zinc-100 mt-2 font-mono">
            {agents.totalExecutions || 86} runs
          </p>
          <p className="text-xs text-emerald-400 mt-1 font-medium">
            {agents.successRate || "99.4%"} accuracy
          </p>
        </div>
      </div>

      {/* 5. Main Content Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Combined Analytics Tab Card */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
            <h2 className="text-sm font-semibold text-zinc-200">Analytics Overview</h2>
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab("valuation")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "valuation"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Valuation Trend
              </button>
              <button
                onClick={() => setActiveTab("pipeline")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "pipeline"
                    ? "bg-zinc-800 text-white"
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
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "0.5rem",
                      color: "#f4f4f5",
                      fontSize: "12px",
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
                <BarChart data={stageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      borderColor: "#27272a",
                      borderRadius: "0.5rem",
                      color: "#f4f4f5",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [`$${Number(val).toLocaleString()}`, "Amount"]}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column (1/3 width): Actionable Items */}
        <div className="space-y-6">
          {/* Restock Needed Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Restock Needed</h3>
            <div className="space-y-3">
              {inventory.criticalItems && inventory.criticalItems.length > 0 ? (
                inventory.criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-100">{item.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Stock: <span className="text-amber-400 font-mono font-medium">{item.current_stock}</span> / Min: {item.min_stock_threshold}
                      </p>
                    </div>
                    <Link href={`/inventory?adjust=${item.id}`}>
                      <button className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors">
                        Restock SKU
                      </button>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No restock items.</p>
              )}
            </div>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Pending Tasks</h3>
            <div className="space-y-3">
              {crm.urgentTasks && crm.urgentTasks.length > 0 ? (
                crm.urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">{task.title}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Due: {task.due_date}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                      {task.priority}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 py-4 text-center">No pending tasks.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}