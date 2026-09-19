"use client";

import React, { useState, useEffect } from "react";
import { crmAPI } from "@/lib/api";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
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
} from "lucide-react";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won"];

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState("kanban"); // "kanban" | "customers" | "tasks"
  const [leads, setLeads] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [formError, setFormError] = useState("");

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

  // New Task Form State
  const [newTask, setNewTask] = useState({
    title: "",
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
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

  const handleCreateLead = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await crmAPI.createLead(newLead);
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
      loadCRMData();
    } catch (err) {
      setFormError(err.message || "Failed to create deal");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await crmAPI.createTask(newTask);
      setAddTaskOpen(false);
      setNewTask({
        title: "",
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        priority: "MEDIUM",
        status: "PENDING",
      });
      loadCRMData();
    } catch (err) {
      setFormError(err.message || "Failed to create task");
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

  // Compute Total Pipeline
  const totalPipeline = leads.reduce((sum, l) => sum + Number(l.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-violet-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            CRM & Enterprise Deal Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual Kanban negotiation funnel, account management and AI customer interaction tracking
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
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-950/40 transition-all duration-200 block relative"
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
                            {lead.company_name || lead.customer?.name || "Enterprise Client"}
                          </span>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="text-xs font-bold font-mono text-emerald-400">
                            ${Number(lead.value || 0).toLocaleString()}
                          </div>

                          {/* Stage Navigation Controls */}
                          <div className="flex items-center gap-1">
                            {stageIdx > 0 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx - 1])}
                                className="p-1.2 rounded-md bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                title={`Move back to ${STAGES[stageIdx - 1]}`}
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {stageIdx < STAGES.length - 1 && (
                              <button
                                onClick={() => handleStageMove(lead.id, STAGES[stageIdx + 1])}
                                className="p-1.2 rounded-md bg-violet-900/40 text-violet-300 hover:bg-violet-600 hover:text-white transition-colors"
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
                          <span>Due: {task.due_date || "No deadline"}</span>
                          <span>•</span>
                          <Badge
                            variant={task.priority === "HIGH" ? "danger" : "purple"}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      <Modal
        isOpen={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        title="Create New CRM Deal / Opportunity"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
              {formError}
            </div>
          )}

          <Input
            label="Deal / Opportunity Title"
            required
            value={newLead.title}
            onChange={(e) => setNewLead({ ...newLead, title: e.target.value })}
            placeholder="e.g. Q4 Autonomous Fleet Expansion"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Company / Client"
              required
              value={newLead.company_name}
              onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
              placeholder="e.g. Atlas Robotics Inc."
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
            <Input
              label="Contact Email"
              type="email"
              value={newLead.contact_email}
              onChange={(e) => setNewLead({ ...newLead, contact_email: e.target.value })}
              placeholder="lead@atlas.com"
            />
            <Input
              label="Contact Phone"
              value={newLead.contact_phone}
              onChange={(e) => setNewLead({ ...newLead, contact_phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Initial Stage
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
                onChange={(e) => setNewLead({ ...newLead, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
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
              Create Deal in Pipeline
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
            label="Task Description"
            required
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="e.g. Send revised logistics SLA agreement"
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
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
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
            <Button type="submit" variant="primary" size="sm">
              Save Follow-up Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}