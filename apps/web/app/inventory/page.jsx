"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { inventoryAPI, demoAPI } from "@/lib/api";
import { useAuthContext } from "@/context/authContext";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Pencil,
  Trash2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const initialAdjustId = searchParams.get("adjust");
  const { isDemo } = useAuthContext();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Shadcn Delete Alert Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Edit Product Form State
  const [editProductData, setEditProductData] = useState({
    id: "",
    name: "",
    sku: "",
    category: "Electronics",
    unit_price: 0,
    current_stock: 0,
    min_stock_threshold: 10,
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
  const [resettingDemo, setResettingDemo] = useState(false);

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
        const matched = productList.find(
          (p) => p.id === initialAdjustId || p.sku === initialAdjustId
        );
        if (matched) {
          setSelectedProduct(matched);
          setAdjustModalOpen(true);
        }
      }
    } catch (err) {
      console.warn("Failed to load products from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustment({
      type: "IN",
      quantity: 10,
      reason: `Replenishment for ${prod.sku}`,
    });
    setFormError("");
    setAdjustModalOpen(true);
  };

  const handleOpenEdit = (prod) => {
    setSelectedProduct(prod);
    setEditProductData({
      id: prod.id,
      name: prod.name,
      sku: prod.sku,
      category: prod.category || "General",
      unit_price: prod.unit_price ?? prod.unitPrice ?? 0,
      current_stock: prod.current_stock ?? prod.quantity ?? 0,
      min_stock_threshold: prod.min_stock_threshold ?? prod.reorderPoint ?? 10,
      description: prod.description || "",
    });
    setFormError("");
    setEditModalOpen(true);
  };

  const handleOpenDelete = (prod) => {
    setProductToDelete(prod);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setDeleteLoading(true);
    try {
      await inventoryAPI.delete(productToDelete.id);
      // Immediately remove from state for instant feedback
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenHistory = async (prod) => {
    setSelectedProduct(prod);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const logs = await inventoryAPI.getHistory(prod.id);
      setHistoryLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.warn("Could not load stock history:", err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const created = await inventoryAPI.create({
        ...newProduct,
        unit_price: Number(newProduct.unit_price),
        current_stock: Number(newProduct.current_stock),
        min_stock_threshold: Number(newProduct.min_stock_threshold),
      });
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
      // Append to local state immediately
      setProducts((prev) => [created, ...prev]);
    } catch (err) {
      setFormError(err.message || "Failed to create product");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const updated = await inventoryAPI.update(editProductData.id, {
        ...editProductData,
        unit_price: Number(editProductData.unit_price),
        current_stock: Number(editProductData.current_stock),
        min_stock_threshold: Number(editProductData.min_stock_threshold),
      });
      setEditModalOpen(false);
      // Update local state immediately
      setProducts((prev) =>
        prev.map((p) => (p.id === editProductData.id ? { ...p, ...updated } : p))
      );
    } catch (err) {
      setFormError(err.message || "Failed to update product");
    }
  };

  const handleExecuteAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setAdjustSubmitting(true);
    setFormError("");

    try {
      const result = await inventoryAPI.adjustStock(selectedProduct.id, {
        type: adjustment.type,
        quantity: Number(adjustment.quantity),
        reason: adjustment.reason,
      });
      setAdjustModalOpen(false);

      // Update the product directly in state for immediate visual synchronization
      const newQty =
        result?.product?.current_stock ??
        (adjustment.type === "IN"
          ? Number(selectedProduct.current_stock || 0) + Number(adjustment.quantity)
          : adjustment.type === "OUT"
          ? Math.max(0, Number(selectedProduct.current_stock || 0) - Number(adjustment.quantity))
          : Number(adjustment.quantity));

      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...p, current_stock: newQty, quantity: newQty }
            : p
        )
      );
    } catch (err) {
      setFormError(err.message || "Stock adjustment failed");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleResetDemoSandbox = async () => {
    if (confirm("Reset demo warehouse items to default initial state?")) {
      setResettingDemo(true);
      try {
        await demoAPI.reset();
        await loadProducts();
      } catch (err) {
        console.error("Failed to reset demo:", err);
      } finally {
        setResettingDemo(false);
      }
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
    const stock = Number(p.current_stock ?? p.quantity ?? 0);
    const min = Number(p.min_stock_threshold ?? p.reorderPoint ?? 10);
    if (statusFilter === "IN_STOCK") matchesStatus = stock > min;
    if (statusFilter === "LOW_STOCK") matchesStatus = stock <= min && stock > 0;
    if (statusFilter === "OUT_OF_STOCK") matchesStatus = stock === 0;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(productArray.map((p) => p.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Execution Mode Banner */}
      {isDemo && (
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Demo Sandbox Mode:</strong> Real-time operations (create, edit, delete, restock) update the interactive sandbox. Real user records remain 100% isolated.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemoSandbox}
            disabled={resettingDemo}
            className="text-[11px] h-7 border-amber-500/40 text-amber-300 hover:bg-amber-950/50"
          >
            <RotateCcw className={`w-3 h-3 mr-1 ${resettingDemo ? "animate-spin" : ""}`} />
            Reset Sandbox Data
          </Button>
        </div>
      )}

      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-violet-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-violet-400" />
            Inventory & Stock Control
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time warehouse SKU tracking, stock log auditing, and automated replenishment workflows
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
            onClick={() => {
              setFormError("");
              setAddModalOpen(true);
            }}
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

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">Healthy Stock</option>
              <option value="LOW_STOCK">Low Stock Alert</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden border-violet-900/30 bg-slate-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Item & Description</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Stock Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-500" />
                    Loading inventory registry...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No products matched your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = Number(prod.current_stock ?? prod.quantity ?? 0);
                  const min = Number(prod.min_stock_threshold ?? prod.reorderPoint ?? 10);
                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock <= min;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-violet-950/20 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white group-hover:text-violet-300 transition-colors">
                          {prod.name}
                        </div>
                        <div className="text-[11px] font-mono text-violet-400 mt-0.5">
                          {prod.sku}
                        </div>
                        {prod.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {prod.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px]">
                          {prod.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        ${Number(prod.unit_price ?? prod.unitPrice ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              isOut
                                ? "text-rose-400"
                                : isLow
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {stock} units
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (min {min})
                          </span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOut
                                ? "bg-rose-600"
                                : isLow
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(100, (stock / (min * 2 || 1)) * 100)}%`,
                            }}
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
                          {/* Stock Adjust / Restock Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAdjust(prod)}
                            className="text-xs py-1 px-2.5 text-violet-300 border-violet-900/60 hover:bg-violet-950/50"
                          >
                            <SlidersHorizontal className="w-3 h-3 mr-1" />
                            Restock
                          </Button>

                          {/* Edit Product Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(prod)}
                            className="text-xs py-1 px-2 text-slate-400 hover:text-white"
                            title="Edit SKU"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>

                          {/* Audit History Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(prod)}
                            className="text-xs py-1 px-2 text-slate-400 hover:text-white"
                            title="Audit Log"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>

                          {/* Delete Product Button (Triggers Shadcn AlertDialog) */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDelete(prod)}
                            className="text-xs py-1 px-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Shadcn UI AlertDialog for Deletion Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Product Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">
                {productToDelete?.name} ({productToDelete?.sku})
              </strong>
              ? This action will remove the product and its associated records from your{" "}
              {isDemo ? "demo sandbox" : "inventory database"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deleteLoading ? "Deleting..." : "Delete SKU"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, category: e.target.value })
                }
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
              onChange={(e) =>
                setNewProduct({ ...newProduct, unit_price: e.target.value })
              }
            />
            <Input
              label="Initial Stock"
              type="number"
              required
              value={newProduct.current_stock}
              onChange={(e) =>
                setNewProduct({ ...newProduct, current_stock: e.target.value })
              }
            />
          </div>

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            required
            value={newProduct.min_stock_threshold}
            onChange={(e) =>
              setNewProduct({ ...newProduct, min_stock_threshold: e.target.value })
            }
          />

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={newProduct.description}
              onChange={(e) =>
                setNewProduct({ ...newProduct, description: e.target.value })
              }
              placeholder="Warehouse bay location, specifications, or supplier notes..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
              Save Product SKU
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Product — ${editProductData.sku}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Product Name"
              required
              value={editProductData.name}
              onChange={(e) =>
                setEditProductData({ ...editProductData, name: e.target.value })
              }
            />
            <Input
              label="SKU Code"
              required
              value={editProductData.sku}
              onChange={(e) =>
                setEditProductData({ ...editProductData, sku: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Category
              </label>
              <select
                value={editProductData.category}
                onChange={(e) =>
                  setEditProductData({ ...editProductData, category: e.target.value })
                }
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
              value={editProductData.unit_price}
              onChange={(e) =>
                setEditProductData({ ...editProductData, unit_price: e.target.value })
              }
            />
            <Input
              label="Current Stock"
              type="number"
              required
              value={editProductData.current_stock}
              onChange={(e) =>
                setEditProductData({ ...editProductData, current_stock: e.target.value })
              }
            />
          </div>

          <Input
            label="Low-Stock Alert Threshold"
            type="number"
            required
            value={editProductData.min_stock_threshold}
            onChange={(e) =>
              setEditProductData({
                ...editProductData,
                min_stock_threshold: e.target.value,
              })
            }
          />

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Description / Notes
            </label>
            <textarea
              rows={3}
              value={editProductData.description}
              onChange={(e) =>
                setEditProductData({ ...editProductData, description: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Adjust / Restock Stock Modal */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title={`Stock Adjustment — ${selectedProduct?.sku || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExecuteAdjustment} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Target Product:</span>
              <span className="font-semibold text-white">{selectedProduct?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Stock:</span>
              <span className="font-bold text-violet-300">
                {selectedProduct?.current_stock ?? selectedProduct?.quantity ?? 0} units
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Alert Threshold:</span>
              <span className="text-slate-300">
                {selectedProduct?.min_stock_threshold ?? selectedProduct?.reorderPoint ?? 10} units
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Adjustment Type
            </label>
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
            onChange={(e) =>
              setAdjustment({ ...adjustment, quantity: e.target.value })
            }
          />

          <Input
            label="Reason / Reference PO / Notes"
            required
            value={adjustment.reason}
            onChange={(e) =>
              setAdjustment({ ...adjustment, reason: e.target.value })
            }
            placeholder="e.g. PO-9843 delivered or Damaged return"
          />

          {/* New projected stock preview */}
          <div className="p-2.5 rounded-lg bg-violet-950/40 border border-violet-900/60 text-xs flex justify-between items-center">
            <span className="text-slate-300">Projected New Stock:</span>
            <span className="font-bold text-white font-mono">
              {adjustment.type === "IN"
                ? Number(selectedProduct?.current_stock ?? selectedProduct?.quantity ?? 0) +
                  Number(adjustment.quantity || 0)
                : adjustment.type === "OUT"
                ? Math.max(
                    0,
                    Number(selectedProduct?.current_stock ?? selectedProduct?.quantity ?? 0) -
                      Number(adjustment.quantity || 0)
                  )
                : Number(adjustment.quantity || 0)}{" "}
              units
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAdjustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              disabled={adjustSubmitting}
            >
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
            <div className="py-8 text-center text-xs text-slate-500">
              Loading audit history...
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No stock logs recorded yet for this SKU.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {historyLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.changeType === "IN"
                            ? "success"
                            : log.changeType === "OUT"
                            ? "danger"
                            : "purple"
                        }
                      >
                        {log.changeType || "ADJUST"}{" "}
                        {Number(log.quantityDelta) > 0
                          ? `+${log.quantityDelta}`
                          : log.quantityDelta}
                      </Badge>
                      <span className="text-slate-300 font-medium">
                        {log.reason || "Manual adjustment"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Previous: {log.previousQuantity} → New:{" "}
                      <strong className="text-slate-200">
                        {log.newQuantity}
                      </strong>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">
                    {new Date(log.createdAt).toLocaleString()}
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
