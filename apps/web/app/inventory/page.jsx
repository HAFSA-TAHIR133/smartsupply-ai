"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { inventoryAPI } from "@/lib/api";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  PackagePlus,
  SlidersHorizontal,
  Bot
} from "lucide-react";

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const initialAdjustId = searchParams.get("adjust");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    category: "Electronics",
    unit_price: 199.99,
    current_stock: 50,
    min_stock_threshold: 15,
    description: "",
  });

  // Adjust Stock Form State
  const [adjustment, setAdjustment] = useState({
    type: "IN", // "IN" | "OUT" | "ADJUSTMENT"
    quantity: 10,
    reason: "Supplier shipment received",
  });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await inventoryAPI.getAll();
      const productList = Array.isArray(res)
        ? res
        : res?.products && Array.isArray(res.products)
        ? res.products
        : res?.items && Array.isArray(res.items)
        ? res.items
        : [];
      
      setProducts(productList);

      if (initialAdjustId && productList.length > 0) {
        const matched = productList.find((p) => p.id === initialAdjustId || p.sku === initialAdjustId);
        if (matched) {
          setSelectedProduct(matched);
          setAdjustModalOpen(true);
        }
      }
    } catch (err) {
      console.warn("Failed to load products from API, using fallback defaults:", err);
      const fallbackList = [
        { id: "1", name: "Industrial Servo Motor X1", sku: "IND-SRV-001", category: "Machinery", unit_price: 1250, current_stock: 4, min_stock_threshold: 15 },
        { id: "2", name: "High-Voltage LiFePO4 Battery Cell", sku: "BAT-LFP-100", category: "Batteries", unit_price: 450, current_stock: 80, min_stock_threshold: 20 },
        { id: "3", name: "Hydraulic Pump Valve 400", sku: "HYD-VAL-400", category: "Machinery", unit_price: 890, current_stock: 12, min_stock_threshold: 20 },
        { id: "4", name: "Stainless Steel M8 Fastener Pack", sku: "FST-M8-SS", category: "Fasteners", unit_price: 25, current_stock: 724, min_stock_threshold: 100 },
      ];
      setProducts(fallbackList);
      if (initialAdjustId) {
        const matched = fallbackList.find((p) => p.id === initialAdjustId || p.sku === initialAdjustId);
        if (matched) {
          setSelectedProduct(matched);
          setAdjustModalOpen(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [initialAdjustId]);

  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustment({
      type: "IN",
      quantity: 10,
      reason: "Supplier batch delivery",
    });
    setFormError("");
    setAdjustModalOpen(true);
  };

  const handleOpenHistory = async (prod) => {
    setSelectedProduct(prod);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const logs = await inventoryAPI.getHistory(prod.id);
      setHistoryLogs(logs || []);
    } catch (err) {
      console.warn("Failed to load history logs:", err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await inventoryAPI.create(newProduct);
      setAddModalOpen(false);
      setNewProduct({
        name: "",
        sku: "",
        category: "Electronics",
        unit_price: 199.99,
        current_stock: 50,
        min_stock_threshold: 15,
        description: "",
      });
      loadProducts();
    } catch (err) {
      setFormError(err.message || "Failed to create product");
    }
  };

  const handleExecuteAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setAdjustSubmitting(true);
    setFormError("");

    try {
      await inventoryAPI.adjustStock(selectedProduct.id, {
        type: adjustment.type,
        quantity: Number(adjustment.quantity),
        reason: adjustment.reason,
      });
      setAdjustModalOpen(false);
      loadProducts();
    } catch (err) {
      setFormError(err.message || "Stock adjustment failed");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Filtered Products (Safe Array Guard)
  const productArray = Array.isArray(products) ? products : [];
  const filteredProducts = productArray.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || p.category === categoryFilter;

    let matchesStatus = true;
    const stock = Number(p.current_stock || 0);
    const min = Number(p.min_stock_threshold || 10);
    if (statusFilter === "IN_STOCK") matchesStatus = stock > min;
    if (statusFilter === "LOW_STOCK") matchesStatus = stock <= min && stock > 0;
    if (statusFilter === "OUT_OF_STOCK") matchesStatus = stock === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(productArray.map((p) => p.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-violet-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-violet-400" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time warehouse SKU tracking, multi-tenant stock log auditing and automated restock triggers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            className="gap-1 text-xs border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => { setFormError(""); setAddModalOpen(true); }}
            className="gap-1.5 text-xs shadow-lg shadow-violet-600/30"
          >
            <Plus className="w-4 h-4" />
            Add New SKU
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900/70 border-violet-900/40">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by SKU, name, or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">Healthy Stock</option>
              <option value="LOW_STOCK">Low Stock Alert</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Inventory Items Data Table */}
      <Card className="bg-slate-900/70 border-violet-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-violet-900/40 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Product / SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    {loading ? "Loading warehouse products..." : "No matching inventory items found."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = Number(prod.current_stock || 0);
                  const min = Number(prod.min_stock_threshold || 10);
                  const isLow = stock <= min && stock > 0;
                  const isOut = stock === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-violet-950/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{prod.name}</div>
                        <div className="font-mono text-[11px] text-violet-400">{prod.sku}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                          {prod.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-200 font-medium">
                        ${Number(prod.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{stock}</span>
                          <span className="text-[10px] text-slate-500">/ min {min}</span>
                        </div>
                        {/* Stock health progress bar */}
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOut ? "bg-rose-600" : isLow ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, (stock / (min * 2)) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isOut ? (
                          <Badge variant="danger" className="gap-1">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="warning" className="gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Healthy
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(prod)}
                            className="text-xs py-1 px-2.5 text-violet-300 border-violet-900/60 hover:bg-violet-950/50"
                          >
                            <SlidersHorizontal className="w-3 h-3 mr-1" />
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(prod)}
                            className="text-xs py-1 px-2 text-slate-400 hover:text-white"
                            title="Audit Log"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Product Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Register New Inventory SKU"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Product Name"
              required
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="e.g. Brushless Motor 24V"
            />
            <Input
              label="SKU Code"
              required
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              placeholder="e.g. MTR-BRSH-024"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="Electronics">Electronics</option>
                <option value="Machinery">Machinery</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Batteries">Batteries</option>
                <option value="Fasteners">Fasteners</option>
              </select>
            </div>
            <Input
              label="Unit Price ($)"
              type="number"
              step="0.01"
              required
              value={newProduct.unit_price}
              onChange={(e) => setNewProduct({ ...newProduct, unit_price: e.target.value })}
            />
            <Input
              label="Initial Stock"
              type="number"
              required
              value={newProduct.current_stock}
              onChange={(e) => setNewProduct({ ...newProduct, current_stock: e.target.value })}
            />
          </div>

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            required
            value={newProduct.min_stock_threshold}
            onChange={(e) => setNewProduct({ ...newProduct, min_stock_threshold: e.target.value })}
            placeholder="Min units before trigger (e.g. 15)"
          />

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Technical specifications, supplier origin, etc."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
              Save SKU to Database
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Adjust Stock — ${selectedProduct?.name || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteAdjustment} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>SKU:</span>
              <span className="font-mono text-white">{selectedProduct?.sku}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current In-Stock:</span>
              <span className="font-bold text-violet-300">{selectedProduct?.current_stock} units</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Alert Threshold:</span>
              <span className="text-slate-300">{selectedProduct?.min_stock_threshold} units</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustment({ ...adjustment, type: "IN" })}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  adjustment.type === "IN"
                    ? "bg-emerald-600/30 border-emerald-500 text-emerald-300"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                + Receive (IN)
              </button>
              <button
                type="button"
                onClick={() => setAdjustment({ ...adjustment, type: "OUT" })}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  adjustment.type === "OUT"
                    ? "bg-rose-600/30 border-rose-500 text-rose-300"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                - Ship (OUT)
              </button>
              <button
                type="button"
                onClick={() => setAdjustment({ ...adjustment, type: "ADJUSTMENT" })}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  adjustment.type === "ADJUSTMENT"
                    ? "bg-violet-600/30 border-violet-500 text-violet-300"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                Cycle Audit
              </button>
            </div>
          </div>

          <Input
            label="Quantity to Adjust"
            type="number"
            min="1"
            required
            value={adjustment.quantity}
            onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })}
          />

          <Input
            label="Reason / Reference PO / Notes"
            required
            value={adjustment.reason}
            onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
            placeholder="e.g. PO-9843 delivered or Damaged return"
          />

          {/* New projected stock preview */}
          <div className="p-2.5 rounded-lg bg-violet-950/40 border border-violet-900/60 text-xs flex justify-between items-center">
            <span className="text-slate-300">Projected New Stock:</span>
            <span className="font-bold text-white font-mono">
              {adjustment.type === "IN"
                ? Number(selectedProduct?.current_stock || 0) + Number(adjustment.quantity || 0)
                : adjustment.type === "OUT"
                ? Math.max(0, Number(selectedProduct?.current_stock || 0) - Number(adjustment.quantity || 0))
                : Number(adjustment.quantity || 0)}{" "}
              units
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm" disabled={adjustSubmitting}>
              {adjustSubmitting ? "Executing..." : "Commit Stock Change"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* History / Audit Log Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Audit Trail — ${selectedProduct?.name || ""}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-3">
          {historyLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading audit history...</div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No stock logs recorded yet for this SKU.</div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {historyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.change_type === "IN" ? "success" : log.change_type === "OUT" ? "danger" : "purple"}>
                        {log.change_type} {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                      </Badge>
                      <span className="text-slate-300 font-medium">{log.reason || "Manual adjustment"}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Previous: {log.previous_stock} → New: <strong className="text-slate-200">{log.new_stock}</strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    {new Date(log.created_at || log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
