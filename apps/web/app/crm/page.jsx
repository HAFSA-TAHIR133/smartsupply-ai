"use client";

import React, { useState, useEffect } from "react";
import { crmAPI, demoAPI } from "@/lib/api";
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
  Users,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  CheckSquare,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  Hash,
  Power,
  UserCheck,
  UserX,
} from "lucide-react";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];

const DEFAULT_LEADS = [
  {
    id: "lead-demo-1",
    title: "High-Precision Stepper Motors Order",
    companyName: "Nexus Robotics Corp",
    contactName: "Elena Rostova",
    contactEmail: "elena.r@nexusrobotics.io",
    contactPhone: "+1 (555) 019-2834",
    value: 85000,
    stage: "Qualified",
    priority: "HIGH",
    notes: "Requires batch testing certification before shipment.",
  },
  {
    id: "lead-demo-2",
    title: "Thermal Sensors & Battery Pack Restock",
    companyName: "AeroGlide Logistics",
    contactName: "David Chen",
    contactEmail: "d.chen@aeroglide.com",
    contactPhone: "+1 (555) 432-8811",
    value: 42000,
    stage: "New",
    priority: "MEDIUM",
    notes: "Requested quote for 200 units of optoelectronic sensors.",
  },
  {
    id: "lead-demo-3",
    title: "Conveyor Belt Automation Overhaul",
    companyName: "PacWest Manufacturing",
    contactName: "Sarah Jenkins",
    contactEmail: "sjenkins@pacwestmfg.com",
    contactPhone: "+1 (555) 872-1190",
    value: 120000,
    stage: "Proposal",
    priority: "HIGH",
    notes: "Proposal submitted for 24V brushless motor system integration.",
  },
];

const DEFAULT_TASKS = [
  {
    id: "task-demo-1",
    title: "Follow up with Marcus Vance on AeroTech quotation",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    priority: "HIGH",
    status: "PENDING",
  },
  {
    id: "task-demo-2",
    title: "Restock PO for Titanium Hex Bolts M8x40",
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
    priority: "HIGH",
    status: "PENDING",
  },
  {
    id: "task-demo-3",
    title: "Send battery compliance specs to SkyGlide Deliveries",
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
    priority: "MEDIUM",
    status: "COMPLETED",
  },
];

export default function CRMPage() {
  const { isDemo } = useAuthContext();
  const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "customers" | "tasks"
  const [leads, setLeads] = useState(DEFAULT_LEADS);
  const [customers, setCustomers] = useState([]);
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [resettingDemo, setResettingDemo] = useState(false);

  // Shadcn Delete Alert Dialogs
  const [deleteLeadDialogOpen, setDeleteLeadDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [leadToEdit, setLeadToEdit] = useState(null);
  const [deleteLeadLoading, setDeleteLeadLoading] = useState(false);

  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  const [deleteCustomerDialogOpen, setDeleteCustomerDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deleteCustomerLoading, setDeleteCustomerLoading] = useState(false);
  const [customerTogglingId, setCustomerTogglingId] = useState(null);

  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    accountNo: "",
    name: "",
    industry: "",
    phone: "",
    email: "",
    status: "ACTIVE",
    createdAt: new Date().toISOString().split("T")[0],
  });

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    title: "",
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    value: 50000,
    stage: "New",
    priority: "HIGH",
    notes: "",
  });

  // Edit Lead Form State
  const [editLeadData, setEditLeadData] = useState({
    id: "",
    title: "",
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    value: 0,
    stage: "New",
    priority: "MEDIUM",
    notes: "",
  });

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    priority: "MEDIUM",
    status: "PENDING",
  });

  // Edit Task Form State
  const [editTaskData, setEditTaskData] = useState({
    id: "",
    title: "",
    due_date: "",
    priority: "MEDIUM",
    status: "PENDING",
  });

  const loadCRMData = async () => {
    setLoading(true);
    try {
      const [leadsData, custData, tasksData] = await Promise.allSettled([
        crmAPI.getLeads(),
        crmAPI.getCustomers(),
        crmAPI.getTasks(),
      ]);

      if (leadsData.status === "fulfilled") {
        const val = leadsData.value;
        setLeads(Array.isArray(val) ? val : (Array.isArray(val?.data) ? val.data : []));
      }
      if (custData.status === "fulfilled") {
        const val = custData.value;
        setCustomers(Array.isArray(val) ? val : (Array.isArray(val?.data) ? val.data : []));
      }
      if (tasksData.status === "fulfilled") {
        const val = tasksData.value;
        setTasks(Array.isArray(val) ? val : (Array.isArray(val?.data) ? val.data : []));
      }
    } catch (err) {
      console.warn("Failed to load CRM data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCRMData();

    const handleDataUpdated = () => {
      loadCRMData();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("smartsupply:data-updated", handleDataUpdated);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("smartsupply:data-updated", handleDataUpdated);
      }
    };
  }, []);

  const handleStageMove = async (leadId, targetStage) => {
    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: targetStage } : l))
    );

    try {
      await crmAPI.updateLeadStage(leadId, targetStage);
    } catch (err) {
      console.warn("Stage update failed on backend, reverting:", err);
      loadCRMData();
    }
  };

  // --- Lead Handlers ---
  const handleCreateLead = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const created = await crmAPI.createLead(newLead);
      setAddLeadOpen(false);
      setNewLead({
        title: "",
        company_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        value: 50000,
        stage: "New",
        priority: "HIGH",
        notes: "",
      });
      // Append directly to leads state
      setLeads((prev) => [created, ...prev]);

      // Synchronize with customer accounts view immediately
      try {
        const refreshedCustomers = await crmAPI.getCustomers();
        if (Array.isArray(refreshedCustomers)) {
          setCustomers(refreshedCustomers);
        } else if (Array.isArray(refreshedCustomers?.data)) {
          setCustomers(refreshedCustomers.data);
        }
      } catch {
        const custFromLead = {
          id: `cust-${created.id}`,
          accountNo: (created.id || "").replace("lead-", "").slice(0, 6).toUpperCase(),
          name: created.companyName || created.company_name || created.title,
          company: created.companyName || created.company_name || created.title,
          industry: created.notes || "Commercial Deal Client",
          email: created.contactEmail || created.contact_email || "contact@client.com",
          phone: created.contactPhone || created.contact_phone || "+1 (555) 019-2831",
          status: "ACTIVE",
          isActive: true,
          leadStage: created.stage,
          createdAt: created.createdAt || new Date().toISOString(),
        };
        setCustomers((prev) => [custFromLead, ...prev]);
      }
    } catch (err) {
      setFormError(err.message || "Failed to create deal");
    }
  };

  // --- Customer Handlers ---
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const created = await crmAPI.createCustomer(newCustomer);
      setAddCustomerOpen(false);
      setNewCustomer({
        accountNo: "",
        name: "",
        industry: "",
        phone: "",
        email: "",
        status: "ACTIVE",
        createdAt: new Date().toISOString().split("T")[0],
      });
      setCustomers((prev) => [created, ...prev]);
    } catch (err) {
      setFormError(err.message || "Failed to register customer account");
    }
  };

  const handleToggleCustomerStatus = async (cust) => {
    const isCurrentlyActive = cust.status !== "INACTIVE" && cust.isActive !== false;
    const nextStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    setCustomerTogglingId(cust.id);

    // Optimistic UI state update
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === cust.id
          ? { ...c, status: nextStatus, isActive: nextStatus === "ACTIVE" }
          : c
      )
    );

    try {
      await crmAPI.updateCustomerStatus(cust.id, nextStatus);
    } catch (err) {
      console.warn("Failed to toggle customer status, reverting:", err);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === cust.id
            ? { ...c, status: isCurrentlyActive ? "ACTIVE" : "INACTIVE", isActive: isCurrentlyActive }
            : c
        )
      );
    } finally {
      setCustomerTogglingId(null);
    }
  };

  const handleOpenDeleteCustomer = (cust) => {
    setCustomerToDelete(cust);
    setDeleteCustomerDialogOpen(true);
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeleteCustomerLoading(true);
    try {
      await crmAPI.deleteCustomer(customerToDelete.id);
      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      setDeleteCustomerDialogOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      console.error("Failed to delete customer:", err);
      setFormError(`Failed to delete customer: ${err.message}`);
    } finally {
      setDeleteCustomerLoading(false);
    }
  };

  const handleOpenEditLead = (lead) => {
    setLeadToEdit(lead);
    setEditLeadData({
      id: lead.id,
      title: lead.title,
      company_name: lead.company_name || lead.companyName || "",
      contact_name: lead.contact_name || lead.contactName || "",
      contact_email: lead.contact_email || lead.contactEmail || "",
      contact_phone: lead.contact_phone || lead.contactPhone || "",
      value: lead.value || 0,
      stage: lead.stage || "New",
      priority: lead.priority || "MEDIUM",
      notes: lead.notes || "",
    });
    setFormError("");
    setEditLeadOpen(true);
  };

  const handleSaveEditLead = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const updated = await crmAPI.updateLead(editLeadData.id, editLeadData);
      setEditLeadOpen(false);
      // Immediately reflect changes in UI
      setLeads((prev) =>
        prev.map((l) => (l.id === editLeadData.id ? { ...l, ...updated } : l))
      );
    } catch (err) {
      setFormError(err.message || "Failed to update lead");
    }
  };

  const handleOpenDeleteLead = (lead) => {
    setLeadToDelete(lead);
    setDeleteLeadDialogOpen(true);
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    setDeleteLeadLoading(true);
    try {
      await crmAPI.deleteLead(leadToDelete.id);
      // Immediately remove from state
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id));
      setDeleteLeadDialogOpen(false);
      setLeadToDelete(null);
    } catch (err) {
      console.error("Failed to delete lead:", err);
      setFormError(`Failed to delete lead: ${err.message}`);
    } finally {
      setDeleteLeadLoading(false);
    }
  };

  // --- Task Handlers ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const created = await crmAPI.createTask(newTask);
      setAddTaskOpen(false);
      setNewTask({
        title: "",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        priority: "MEDIUM",
        status: "PENDING",
      });
      // Append directly to state
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      setFormError(err.message || "Failed to create task");
    }
  };

  const handleOpenEditTask = (task) => {
    setEditTaskData({
      id: task.id,
      title: task.title,
      due_date: task.due_date || task.dueDate || "",
      priority: task.priority || "MEDIUM",
      status: task.status || "PENDING",
    });
    setFormError("");
    setEditTaskOpen(true);
  };

  const handleSaveEditTask = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      const updated = await crmAPI.updateTask(editTaskData.id, editTaskData);
      setEditTaskOpen(false);
      // Immediately reflect in state
      setTasks((prev) =>
        prev.map((t) => (t.id === editTaskData.id ? { ...t, ...updated } : t))
      );
    } catch (err) {
      setFormError(err.message || "Failed to update task");
    }
  };

  const handleOpenDeleteTask = (task) => {
    setTaskToDelete(task);
    setDeleteTaskDialogOpen(true);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleteTaskLoading(true);
    try {
      await crmAPI.deleteTask(taskToDelete.id);
      // Immediately remove from state
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setDeleteTaskDialogOpen(false);
      setTaskToDelete(null);
    } catch (err) {
      console.error("Failed to delete task:", err);
      setFormError(`Failed to delete task: ${err.message}`);
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  const handleToggleTask = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );
    try {
      await crmAPI.updateTask(taskId, { status: nextStatus });
    } catch (err) {
      loadCRMData();
    }
  };

  const handleResetDemoSandbox = async () => {
    if (confirm("Reset demo CRM deals and tasks to default initial state?")) {
      setResettingDemo(true);
      try {
        await demoAPI.reset();
        await loadCRMData();
      } catch (err) {
        console.error("Failed to reset demo:", err);
      } finally {
        setResettingDemo(false);
      }
    }
  };

  // Safe array guards for resilient rendering
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Compute Total Pipeline
  const totalPipeline = safeLeads.reduce((sum, l) => sum + Number(l.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Execution Mode Banner */}
      {isDemo && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Demo Sandbox Mode:</strong> Real-time operations (create, edit, delete deals & tasks) update the interactive sandbox. Real user records remain 100% isolated.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemoSandbox}
            disabled={resettingDemo}
            className="text-[11px] h-7 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
          >
            <RotateCcw className={`w-3 h-3 mr-1 ${resettingDemo ? "animate-spin" : ""}`} />
            Reset Sandbox Data
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            CRM & Enterprise Deal Pipeline
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Visual Kanban negotiation funnel, account management, and customer interaction tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCRMData}
            className="gap-1.5 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError("");
              setAddLeadOpen(true);
            }}
            className="gap-1.5 text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Deal / Lead
          </Button>
        </div>
      </div>

      {/* Tabs and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "kanban"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pipeline Kanban
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "customers"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Customers & Accounts ({safeCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === "tasks"
                ? "bg-zinc-800 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tasks & Follow-ups ({safeTasks.length})
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
          <span className="text-zinc-400">Total Pipeline Value:</span>
          <span className="font-bold font-mono text-emerald-400">
            ${totalPipeline.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tab 1: Kanban Board */}
      {activeTab === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-w-full scrollbar-thin">
          {STAGES.map((stageName, stageIdx) => {
            const stageLeads = safeLeads.filter(
              (l) => (l.stage || "New").toLowerCase() === stageName.toLowerCase()
            );
            const stageTotal = stageLeads.reduce(
              (sum, l) => sum + Number(l.value || 0),
              0
            );

            return (
              <div
                key={stageName}
                className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col w-72 shrink-0 shadow-xs"
              >
                {/* Stage Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {stageName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700/60 text-[10px] font-mono font-medium text-zinc-300">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    ${stageTotal.toLocaleString()}
                  </span>
                </div>

                {/* Lead Cards Container */}
                <div className="space-y-3 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center text-[11px] text-zinc-500 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/40">
                      No deals in {stageName}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850/60 transition-colors block relative group shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-zinc-100 leading-snug line-clamp-2">
                            {lead.title}
                          </h4>
                          <Badge
                            variant={lead.priority === "HIGH" ? "danger" : "secondary"}
                            className="text-[9px] px-1.5 py-0.5 shrink-0 uppercase tracking-wider font-semibold"
                          >
                            {lead.priority || "MED"}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate font-medium">
                            {lead.company_name || lead.companyName || "Enterprise Client"}
                          </span>
                        </div>

                        {lead.contact_name && (
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Contact: {lead.contact_name} {lead.contact_phone ? `(${lead.contact_phone})` : ""}
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                          <div className="text-xs font-bold font-mono text-emerald-400">
                            ${Number(lead.value || 0).toLocaleString()}
                          </div>

                          {/* Actions: Edit, Delete, Stage Move */}
                          <div className="flex items-center gap-1">
                            {/* Edit Lead Button */}
                            <button
                              onClick={() => handleOpenEditLead(lead)}
                              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                              title="Edit Deal"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {/* Delete Lead Button (Shadcn AlertDialog) */}
                            <button
                              onClick={() => handleOpenDeleteLead(lead)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Stage Navigation Controls */}
                            {stageIdx > 0 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx - 1])}
                                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                                title={`Move back to ${STAGES[stageIdx - 1]}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {stageIdx < STAGES.length - 1 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx + 1])}
                                className="p-1 rounded bg-indigo-500/10 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                title={`Advance to ${STAGES[stageIdx + 1]}`}
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Customers & Accounts List */}
      {activeTab === "customers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Customer Accounts & Client Directory
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage registered customer accounts, lead affiliations, and toggle activation status in real time.
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setFormError("");
                setAddCustomerOpen(true);
              }}
              className="text-xs gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Customer Account
            </Button>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Account No</th>
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-4">Industry / Domain</th>
                    <th className="py-3 px-4">Primary Contact</th>
                    <th className="py-3 px-4">Status & Control</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {safeCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        No customer accounts registered yet. Click &quot;Add Customer Account&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    safeCustomers.map((cust) => {
                      const isActive = cust.status !== "INACTIVE" && cust.isActive !== false;
                      const isToggling = customerTogglingId === cust.id;
                      return (
                        <tr key={cust.id} className="hover:bg-zinc-850/40 transition-colors group">
                          <td className="py-3.5 px-4 font-mono text-[11px] font-medium text-zinc-300">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60">
                              #{cust.accountNo || cust.id?.replace("cust-", "").slice(0, 6) || "—"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-zinc-100">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                              <div className="flex flex-col">
                                <span className="text-zinc-100">{cust.name || cust.company || "Unnamed Client"}</span>
                                {cust.leadStage && (
                                  <span className="text-[10px] font-normal text-zinc-400">
                                    Lead Stage: {cust.leadStage}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            {cust.industry || cust.notes || "Logistics / Industrial"}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-300">
                            <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                              <Phone className="w-3 h-3 text-zinc-500" />
                              <span>{cust.phone || cust.contactPhone || cust.contact_phone || "—"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                              <Mail className="w-3 h-3 text-zinc-500" />
                              <span>{cust.email || cust.contactEmail || cust.contact_email || "contact@client.com"}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <Badge variant={isActive ? "success" : "secondary"}>
                                {isActive ? "Active" : "Inactive"}
                              </Badge>

                              {/* Interactive Activate / Deactivate Toggle Button */}
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleCustomerStatus(cust)}
                                className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md font-medium border transition-colors ${
                                  isActive
                                    ? "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20"
                                } disabled:opacity-50`}
                                title={isActive ? "Click to deactivate this customer account" : "Click to activate this customer account"}
                              >
                                <Power className={`w-3 h-3 ${isToggling ? "animate-spin" : ""}`} />
                                <span>{isActive ? "Deactivate" : "Activate"}</span>
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                            {new Date(
                              cust.createdAt || cust.created_at || cust.createdOn || Date.now()
                            ).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteCustomer(cust)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete customer account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: CRM Tasks & Follow-ups */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormError("");
                setAddTaskOpen(true);
              }}
              className="text-xs gap-1.5 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Follow-up Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {safeTasks.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
                No active CRM follow-ups. All deals on schedule!
              </div>
            ) : (
              safeTasks.map((task) => {
                const isDone = task.status === "COMPLETED";
                return (
                  <div
                    key={task.id}
                    className={`p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-start justify-between gap-3 shadow-xs ${
                      isDone ? "opacity-60 bg-zinc-900/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`mt-0.5 w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "border-zinc-700 bg-zinc-950 hover:border-zinc-500"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-medium ${
                            isDone ? "line-through text-zinc-500" : "text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          <span>Due: {task.due_date || task.dueDate || "No deadline"}</span>
                          <span className="text-zinc-600">•</span>
                          <Badge
                            variant={task.priority === "HIGH" ? "danger" : "secondary"}
                            className="text-[9px] px-1.5 py-0.5 uppercase tracking-wide"
                          >
                            {task.priority || "MED"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditTask(task)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                        title="Edit Task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteTask(task)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Shadcn UI AlertDialog for Deleting a Lead */}
      <AlertDialog
        open={deleteLeadDialogOpen}
        onOpenChange={setDeleteLeadDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Deal Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to delete lead{" "}
              <strong className="text-zinc-100">&ldquo;{leadToDelete?.title}&rdquo;</strong> ($
              {Number(leadToDelete?.value || 0).toLocaleString()})? This operation will remove the opportunity from your{" "}
              {isDemo ? "demo sandbox" : "pipeline records"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLeadLoading} className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteLead}
              disabled={deleteLeadLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              {deleteLeadLoading ? "Deleting..." : "Delete Deal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shadcn UI AlertDialog for Deleting a Task */}
      <AlertDialog
        open={deleteTaskDialogOpen}
        onOpenChange={setDeleteTaskDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Task Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to delete the follow-up task{" "}
              <strong className="text-zinc-100">&ldquo;{taskToDelete?.title}&rdquo;</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTaskLoading} className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTask}
              disabled={deleteTaskLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              {deleteTaskLoading ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Lead Modal */}
      <Modal
        isOpen={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        title="Create New Enterprise Lead / Deal"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="Deal Title"
            required
            value={newLead.title}
            onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
            placeholder="e.g. Q4 Automated Warehouse Expansion"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              required
              value={newLead.company_name}
              onChange={(e) =>
                setNewLead({ ...newLead, company_name: e.target.value })
              }
              placeholder="e.g. AeroTech Automations"
            />
            <Input
              label="Deal Value ($)"
              type="number"
              required
              value={newLead.value}
              onChange={(e) => setNewLead({ ...newLead, value: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Pipeline Stage
              </label>
              <select
                value={newLead.stage}
                onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Priority
              </label>
              <select
                value={newLead.priority}
                onChange={(e) =>
                  setNewLead({ ...newLead, priority: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Contact Person"
              value={newLead.contact_name}
              onChange={(e) =>
                setNewLead({ ...newLead, contact_name: e.target.value })
              }
              placeholder="Full Name"
            />
            <Input
              label="Contact Email"
              type="email"
              value={newLead.contact_email}
              onChange={(e) =>
                setNewLead({ ...newLead, contact_email: e.target.value })
              }
              placeholder="email@domain.com"
            />
            <Input
              label="Contact Phone"
              value={newLead.contact_phone}
              onChange={(e) =>
                setNewLead({ ...newLead, contact_phone: e.target.value })
              }
              placeholder="+1 555..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Deal Notes & Requirements
            </label>
            <textarea
              rows={3}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
              placeholder="Customer requirements, estimated delivery timeframe, procurement contacts..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddLeadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={editLeadOpen}
        onClose={() => setEditLeadOpen(false)}
        title={`Edit Lead — ${editLeadData.title}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEditLead} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <Input
            label="Deal Title"
            required
            value={editLeadData.title}
            onChange={(e) =>
              setEditLeadData({ ...editLeadData, title: e.target.value })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company Name"
              required
              value={editLeadData.company_name}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, company_name: e.target.value })
              }
            />
            <Input
              label="Deal Value ($)"
              type="number"
              required
              value={editLeadData.value}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, value: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Pipeline Stage
              </label>
              <select
                value={editLeadData.stage}
                onChange={(e) =>
                  setEditLeadData({ ...editLeadData, stage: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Priority
              </label>
              <select
                value={editLeadData.priority}
                onChange={(e) =>
                  setEditLeadData({ ...editLeadData, priority: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Contact Person"
              value={editLeadData.contact_name}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, contact_name: e.target.value })
              }
            />
            <Input
              label="Contact Email"
              type="email"
              value={editLeadData.contact_email}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, contact_email: e.target.value })
              }
            />
            <Input
              label="Contact Phone"
              value={editLeadData.contact_phone}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, contact_phone: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Deal Notes & Requirements
            </label>
            <textarea
              rows={3}
              value={editLeadData.notes}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, notes: e.target.value })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditLeadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        title="Schedule CRM Action Item"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {formError}
            </div>
          )}
          <Input
            label="Action Description"
            required
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="e.g. Schedule warehouse site visit"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              required
              value={newTask.due_date}
              onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            />
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={editTaskOpen}
        onClose={() => setEditTaskOpen(false)}
        title="Edit Follow-up Task"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEditTask} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {formError}
            </div>
          )}
          <Input
            label="Action Description"
            required
            value={editTaskData.title}
            onChange={(e) =>
              setEditTaskData({ ...editTaskData, title: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Due Date"
              type="date"
              required
              value={editTaskData.due_date}
              onChange={(e) =>
                setEditTaskData({ ...editTaskData, due_date: e.target.value })
              }
            />
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Priority
              </label>
              <select
                value={editTaskData.priority}
                onChange={(e) =>
                  setEditTaskData({ ...editTaskData, priority: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Account Modal */}
      <Modal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        title="Register Customer Account"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Customer Account #"
              placeholder="e.g. 12"
              required
              value={newCustomer.accountNo}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, accountNo: e.target.value })
              }
            />
            <Input
              label="Customer / Account Name"
              placeholder="e.g. Aeropax Industries"
              required
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, name: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Industry / Domain"
              placeholder="e.g. Aeropax Industries"
              required
              value={newCustomer.industry}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, industry: e.target.value })
              }
            />
            <Input
              label="Primary Contact (Phone)"
              placeholder="e.g. 03001254165"
              required
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, phone: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Email"
              type="email"
              placeholder="contact@aeropax.com"
              value={newCustomer.email}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
            />
            <Input
              label="Created Date"
              type="date"
              value={newCustomer.createdAt}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, createdAt: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Initial Account Status
            </label>
            <select
              value={newCustomer.status}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, status: e.target.value })
              }
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddCustomerOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Register Customer Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Customer Account Dialog */}
      <AlertDialog
        open={deleteCustomerDialogOpen}
        onOpenChange={setDeleteCustomerDialogOpen}
      >
        <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Delete Customer Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to permanently delete{" "}
              <strong className="text-zinc-200">
                {customerToDelete?.name || "this customer account"}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteCustomerLoading}
              className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCustomer}
              disabled={deleteCustomerLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium"
            >
              {deleteCustomerLoading ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
