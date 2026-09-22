"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { chartsAPI, inventoryAPI } from "@/lib/api";
import { useAuthContext } from "@/context/authContext";

const PRESET_SOURCES = [
  {
    id: "inventory_category",
    name: "Inventory by Category",
    defaultTitle: "Stock Distribution by Category",
    defaultType: "bar",
    data: [
      { name: "Electronics", value: 145 },
      { name: "Accessories", value: 89 },
      { name: "Peripherals", value: 64 },
      { name: "Storage", value: 38 },
      { name: "Cables", value: 52 },
    ],
  },
  {
    id: "stock_health",
    name: "Stock Valuation Trend",
    defaultTitle: "30-Day Inventory Valuation Trend",
    defaultType: "area",
    data: [
      { name: "Week 1", value: 12400 },
      { name: "Week 2", value: 14200 },
      { name: "Week 3", value: 13800 },
      { name: "Week 4", value: 18500 },
      { name: "Current", value: 16900 },
    ],
  },
  {
    id: "crm_pipeline",
    name: "CRM Pipeline Velocity",
    defaultTitle: "Deal Distribution by Pipeline Stage",
    defaultType: "bar",
    data: [
      { name: "New Lead", value: 24 },
      { name: "Contacted", value: 18 },
      { name: "Qualified", value: 12 },
      { name: "Proposal", value: 7 },
      { name: "Won", value: 5 },
    ],
  },
  {
    id: "stock_risk",
    name: "Safety Threshold Ratios",
    defaultTitle: "Warehouse Risk Distribution",
    defaultType: "pie",
    data: [
      { name: "Healthy Stock", value: 68 },
      { name: "Low Stock Alert", value: 22 },
      { name: "Critical Out of Stock", value: 10 },
    ],
  },
];

const PIE_COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];

const DEFAULT_CHARTS = PRESET_SOURCES.map((p) => ({
  id: `preset-chart-${p.id}`,
  title: p.defaultTitle,
  type: p.defaultType,
  config: {
    dataSource: p.id,
    data: p.data,
  },
  createdAt: new Date().toISOString(),
}));

export default function ChartsPage() {
  const { user } = useAuthContext();
  const [charts, setCharts] = useState(DEFAULT_CHARTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Builder Modal State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("bar");
  const [selectedPreset, setSelectedPreset] = useState("inventory_category");
  const [customData, setCustomData] = useState(PRESET_SOURCES[0].data);
  const [creating, setCreating] = useState(false);

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCharts(false);
    }
  }, [user]);

  const fetchCharts = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await chartsAPI.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setCharts(data);
      }
    } catch (err) {
      if (showLoading) {
        setError(err.message || "Failed to load charts.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSelectPreset = (presetId) => {
    const preset = PRESET_SOURCES.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset.id);
      setNewTitle(preset.defaultTitle);
      setNewType(preset.defaultType);
      setCustomData(preset.data);
    }
  };

  const openBuilder = () => {
    handleSelectPreset("inventory_category");
    setBuilderOpen(true);
  };

  const handleCreateChart = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreating(true);
    try {
      const created = await chartsAPI.create({
        title: newTitle.trim(),
        type: newType,
        config: {
          dataSource: selectedPreset,
          data: customData,
        },
      });

      setCharts((prev) => [created, ...prev]);
      setBuilderOpen(false);
    } catch (err) {
      console.error("Could not create chart:", err);
      setError(`Could not create chart: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const promptDeleteChart = (chart) => {
    setChartToDelete(chart);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!chartToDelete) return;

    setDeleting(true);
    try {
      await chartsAPI.delete(chartToDelete.id);
      setCharts((prev) => prev.filter((c) => c.id !== chartToDelete.id));
      setDeleteModalOpen(false);
      setChartToDelete(null);
    } catch (err) {
      console.error("Could not delete chart:", err);
      setError(`Could not delete chart: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const renderChartGraphic = (type, data) => {
    const chartData = Array.isArray(data) && data.length > 0 ? data : PRESET_SOURCES[0].data;

    switch (type) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
              />
              <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#areaGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
              />
              <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3, fill: "#38bdf8" }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={65}
                innerRadius={38}
                paddingAngle={4}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
      case "bar":
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                <BarChart3 className="h-5 w-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Visual Analytics & Charts
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Create, inspect, and manage custom warehouse telemetry & operational visualizations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchCharts}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh Charts"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={openBuilder}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Chart</span>
            </button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-5 flex flex-col justify-between animate-pulse"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-zinc-800 rounded-md w-2/3" />
                  <div className="h-3 bg-zinc-800/50 rounded-md w-1/3" />
                </div>
                <div className="h-36 bg-zinc-800/30 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {!loading && error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchCharts}
              className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-white font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && charts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4">
            <div className="p-3.5 rounded-full bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">No charts yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Create your first operational visual chart using the interactive builder or by asking the AI Assistant in the chat drawer.
              </p>
            </div>
            <button
              onClick={openBuilder}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Chart</span>
            </button>
          </div>
        )}

        {/* Charts Grid */}
        {!loading && !error && charts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {charts.map((chart) => {
              const data = chart.config?.data || [];
              return (
                <motion.div
                  key={chart.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all p-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                        {chart.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                        {chart.type} • {new Date(chart.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => promptDeleteChart(chart)}
                      title="Delete Chart"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Graphic Visualization */}
                  <div className="h-44 w-full pt-1">
                    {renderChartGraphic(chart.type, data)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Builder Modal */}
        <AnimatePresence>
          {builderOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setBuilderOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-100 shadow-2xl z-10 space-y-5"
              >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-semibold">New Chart Builder</h2>
                  </div>
                  <button
                    onClick={() => setBuilderOpen(false)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateChart} className="space-y-4">
                  {/* Preset Data Source Selector */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
                      Select Data Source Template
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_SOURCES.map((preset) => {
                        const isSelected = selectedPreset === preset.id;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => handleSelectPreset(preset.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-600/15 border-indigo-500 text-white"
                                : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                            }`}
                          >
                            <p className="font-semibold text-[11px]">{preset.name}</p>
                            <p className="text-[10px] text-zinc-500 capitalize">{preset.defaultType} Chart</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chart Title */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Chart Title
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Q3 Restocking Trend"
                      required
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Chart Type Selector */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
                      Chart Type
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: "bar", label: "Bar", icon: BarChart3 },
                        { id: "area", label: "Area", icon: AreaChartIcon },
                        { id: "line", label: "Line", icon: LineChartIcon },
                        { id: "pie", label: "Pie", icon: PieChartIcon },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = newType === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setNewType(item.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Mini Preview */}
                  <div>
                    <label className="block text-[10px] font-medium text-zinc-400 mb-1">
                      Live Preview
                    </label>
                    <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800 p-2">
                      {renderChartGraphic(newType, customData)}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBuilderOpen(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium hover:bg-zinc-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating || !newTitle.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
                    >
                      {creating ? (
                        <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Save & Publish Chart</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteModalOpen && chartToDelete && (
            <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteModalOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              />

              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-sm rounded-2xl border border-rose-500/30 bg-zinc-950 p-6 text-zinc-100 shadow-2xl z-10 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Delete Chart</h3>
                    <p className="text-xs text-zinc-400">Destructive action</p>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white">&ldquo;{chartToDelete.title}&rdquo;</strong>? This visual will be removed from your dashboard.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all"
                  >
                    {deleting ? (
                      <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    <span>Delete Chart</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
  );
}
