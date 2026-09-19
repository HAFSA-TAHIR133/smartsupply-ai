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
} from "lucide-react";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];

export default function CRMPage() {
  const { isDemo } = useAuthContext();
  const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "customers" | "tasks"
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [resettingDemo, setResettingDemo] = useState(false);

  // Shadcn Delete Alert Dialogs
  const [deleteLeadDialogOpen, setDeleteLeadDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [deleteLeadLoading, setDeleteLeadLoading] = useState(false);

  const [deleteTaskDialogOpen, setDeleteTaskDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

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

      if (leadsData.status === "fulfilled") setLeads(leadsData.value || []);
      if (custData.status === "fulfilled") setCustomers(custData.value || []);
      if (tasksData.status === "fulfilled") setTasks(tasksData.value || []);
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
      // Append directly to state
      setLeads((prev) => [created, ...prev]);
    } catch (err) {
      setFormError(err.message || "Failed to create deal");
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

  const [leadToEdit, setLeadToEdit] = useState(null);

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

  // Compute Total Pipeline
  const totalPipeline = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Execution Mode Banner */}
      {isDemo && (
        <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
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
            className="text-[11px] h-7 border-amber-500/40 text-amber-300 hover:bg-amber-950/50"
          >
            <RotateCcw className={`w-3 h-3 mr-1 ${resettingDemo ? "animate-spin" : ""}`} />
            Reset Sandbox Data
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-violet-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            CRM & Enterprise Deal Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual Kanban negotiation funnel, account management, and AI customer interaction tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCRMData}
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
              setAddLeadOpen(true);
            }}
            className="gap-1.5 text-xs shadow-lg shadow-violet-600/30"
          >
            <Plus className="w-4 h-4" />
            New Deal / Lead
          </Button>
        </div>
      </div>

      {/* Tabs and Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "kanban"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Pipeline Kanban
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "customers"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Customers & Accounts ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "tasks"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Tasks & Follow-ups ({tasks.length})
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-900/60 border border-violet-900/40 rounded-xl px-3 py-1.5">
          <span className="text-slate-400">Total Pipeline Value:</span>
          <span className="font-bold font-mono text-emerald-400">
            ${totalPipeline.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tab 1: Kanban Board */}
      {activeTab === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-w-full scrollbar-thin scrollbar-thumb-slate-800">
          {STAGES.map((stageName, stageIdx) => {
            const stageLeads = leads.filter(
              (l) => (l.stage || "New").toLowerCase() === stageName.toLowerCase()
            );
            const stageTotal = stageLeads.reduce(
              (sum, l) => sum + Number(l.value || 0),
              0
            );

            return (
              <div
                key={stageName}
                className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col w-72 shrink-0 shadow-sm"
              >
                {/* Stage Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {stageName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-violet-950 border border-violet-800/60 text-[10px] font-mono font-medium text-violet-300">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    ${stageTotal.toLocaleString()}
                  </span>
                </div>

                {/* Lead Cards Container */}
                <div className="space-y-3.5 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-center text-[11px] text-slate-500 border border-dashed border-slate-800/80 rounded-xl bg-slate-900/30">
                      No deals in {stageName}
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-950/40 transition-all duration-200 block relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-100 leading-snug line-clamp-2">
                            {lead.title}
                          </h4>
                          <Badge
                            variant={lead.priority === "HIGH" ? "danger" : "purple"}
                            className="text-[9px] px-1.5 py-0.5 shrink-0 uppercase tracking-wider font-semibold"
                          >
                            {lead.priority || "MED"}
                          </Badge>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
                          <span className="truncate font-medium">
                            {lead.company_name || lead.companyName || "Enterprise Client"}
                          </span>
                        </div>

                        {lead.contact_name && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            Contact: {lead.contact_name} {lead.contact_phone ? `(${lead.contact_phone})` : ""}
                          </div>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="text-xs font-bold font-mono text-emerald-400">
                            ${Number(lead.value || 0).toLocaleString()}
                          </div>

                          {/* Actions: Edit, Delete, Stage Move */}
                          <div className="flex items-center gap-1">
                            {/* Edit Lead Button */}
                            <button
                              onClick={() => handleOpenEditLead(lead)}
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="Edit Deal"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {/* Delete Lead Button (Shadcn AlertDialog) */}
                            <button
                              onClick={() => handleOpenDeleteLead(lead)}
                              className="p-1 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Stage Navigation Controls */}
                            {stageIdx > 0 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx - 1])}
                                className="p-1 rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title={`Move back to ${STAGES[stageIdx - 1]}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {stageIdx < STAGES.length - 1 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx + 1])}
                                className="p-1 rounded-md bg-violet-900/40 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors"
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
        <Card className="bg-slate-900/70 border-violet-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-violet-900/40 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Customer Account</th>
                  <th className="py-3 px-4">Industry / Domain</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No customer accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-violet-950/20 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-violet-400" />
                          <span>{cust.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {cust.industry || "Logistics / Industrial"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{cust.email || "contact@client.com"}</div>
                        <div className="text-[10px] text-slate-500">
                          {cust.phone || "+1 (555) 019-2831"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant="success">Active Partner</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(
                          cust.created_at || cust.createdAt || Date.now()
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
              className="text-xs gap-1 border-slate-800 text-slate-300"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Follow-up Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-slate-500">
                No active CRM follow-ups. All deals on schedule!
              </div>
            ) : (
              tasks.map((task) => {
                const isDone = task.status === "COMPLETED";
                return (
                  <Card
                    key={task.id}
                    className={`p-4 bg-slate-900/80 border-slate-800 flex items-start justify-between gap-3 ${
                      isDone ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-emerald-600 border-emerald-500 text-white"
                            : "border-slate-700 bg-slate-950 hover:border-violet-500"
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="space-y-1">
                        <p
                          className={`text-xs font-semibold ${
                            isDone ? "line-through text-slate-400" : "text-white"
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Due: {task.due_date || task.dueDate || "No deadline"}</span>
                          <span>•</span>
                          <Badge
                            variant={task.priority === "HIGH" ? "danger" : "purple"}
                            className="text-[9px] px-1.5 py-0.2 uppercase"
                          >
                            {task.priority || "MED"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditTask(task)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit Task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteTask(task)}
                        className="p-1 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Deal Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete lead{" "}
              <strong className="text-white">&ldquo;{leadToDelete?.title}&rdquo;</strong> ($
              {Number(leadToDelete?.value || 0).toLocaleString()})? This operation will remove the opportunity from your{" "}
              {isDemo ? "demo sandbox" : "pipeline records"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLeadLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteLead}
              disabled={deleteLeadLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Task Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the follow-up task{" "}
              <strong className="text-white">&ldquo;{taskToDelete?.title}&rdquo;</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTaskLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTask}
              disabled={deleteTaskLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
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
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
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
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Pipeline Stage
              </label>
              <select
                value={newLead.stage}
                onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Priority
              </label>
              <select
                value={newLead.priority}
                onChange={(e) =>
                  setNewLead({ ...newLead, priority: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
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
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Deal Notes & Requirements
            </label>
            <textarea
              rows={3}
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
              placeholder="Customer requirements, estimated delivery timeframe, procurement contacts..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddLeadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
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
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
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
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Pipeline Stage
              </label>
              <select
                value={editLeadData.stage}
                onChange={(e) =>
                  setEditLeadData({ ...editLeadData, stage: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Priority
              </label>
              <select
                value={editLeadData.priority}
                onChange={(e) =>
                  setEditLeadData({ ...editLeadData, priority: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
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
            <label className="text-xs font-medium text-slate-300 block mb-1">
              Deal Notes & Requirements
            </label>
            <textarea
              rows={3}
              value={editLeadData.notes}
              onChange={(e) =>
                setEditLeadData({ ...editLeadData, notes: e.target.value })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditLeadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
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
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
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
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
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
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
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
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Priority
              </label>
              <select
                value={editTaskData.priority}
                onChange={(e) =>
                  setEditTaskData({ ...editTaskData, priority: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditTaskOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
              Save Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
