"use client";

import React, { useState, useEffect } from "react";
import { agentAPI } from "@/lib/api";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import {
  Bot,
  Boxes,
  Users,
  FileText,
  Workflow,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Code2,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Activity,
  ChevronRight
} from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [execModalOpen, setExecModalOpen] = useState(false);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      const [agentsData, execsData] = await Promise.allSettled([
        agentAPI.getAll(),
        agentAPI.getExecutions(),
      ]);

      if (agentsData.status === "fulfilled" && agentsData.value?.length > 0) {
        setAgents(agentsData.value);
      } else {
        // Fallback default 4 agents
        setAgents([
          {
            id: "inventory",
            name: "Inventory & Stock Autonomous Agent",
            agent_type: "INVENTORY",
            is_active: true,
            model: "groq/compound",
            allowed_tools: ["get_all_products", "get_low_stock_items", "adjust_stock_level", "audit_stock_history"],
            system_prompt: "You are the autonomous Inventory Control AI Agent. You inspect stock thresholds, trigger automated purchase orders, and audit stock movement logs.",
          },
          {
            id: "crm",
            name: "CRM Deals & Pipeline Specialist",
            agent_type: "CRM",
            is_active: true,
            model: "groq/compound",
            allowed_tools: ["get_pipeline_summary", "get_leads_by_stage", "advance_lead_stage", "get_urgent_tasks"],
            system_prompt: "You are the autonomous CRM & Pipeline Specialist. You evaluate lead qualification, stage velocity, deal values, and urgent task SLA deadlines.",
          },
          {
            id: "document",
            name: "Document Knowledge & RAG Agent",
            agent_type: "DOCUMENT",
            is_active: true,
            model: "groq/compound",
            allowed_tools: ["search_knowledge_chunks", "get_document_metadata"],
            system_prompt: "You are the Document RAG Specialist. You retrieve grounded text chunks from supplier SLAs, warranties, and technical contracts with citations.",
          },
          {
            id: "supply_chain",
            name: "Master Supply Chain Orchestrator",
            agent_type: "SUPPLY_CHAIN",
            is_active: true,
            model: "groq/compound",
            allowed_tools: ["cross_correlate_inventory_crm", "generate_executive_audit", "assess_supplier_risk"],
            system_prompt: "You are the Master Supply Chain Orchestrator. You synthesize inventory health, CRM pipeline demand, and contract compliance into unified executive decisions.",
          },
        ]);
      }

      if (execsData.status === "fulfilled" && execsData.value?.length > 0) {
        setExecutions(execsData.value);
      } else {
        // Seed default executions
        setExecutions([
          {
            id: "exec-101",
            agent_type: "INVENTORY",
            query: "Analyze warehouse stock for all motors and report items needing reorder",
            tools_used: ["get_low_stock_items"],
            status: "SUCCESS",
            latency_ms: 680,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            output: "Identified 2 critical SKUs below threshold: Industrial Servo Motor X1 (4/15) and Hydraulic Pump Valve (12/20). Recommend immediate PO generation.",
          },
          {
            id: "exec-102",
            agent_type: "CRM",
            query: "What is the total value of deals in Qualified stage?",
            tools_used: ["get_pipeline_summary"],
            status: "SUCCESS",
            latency_ms: 540,
            created_at: new Date(Date.now() - 7200000).toISOString(),
            output: "Qualified stage contains 1 high-value enterprise opportunity ($145,000.00). Total pipeline across all stages is $293,500.00.",
          },
          {
            id: "exec-103",
            agent_type: "DOCUMENT",
            query: "What is the warranty SLA and replacement lead time for batteries?",
            tools_used: ["search_knowledge_chunks"],
            status: "SUCCESS",
            latency_ms: 720,
            created_at: new Date(Date.now() - 10800000).toISOString(),
            output: "According to SLA Section 4.2: Standard replacement delivery window is 48 business hours with 24-month comprehensive defect coverage.",
          },
        ]);
      }
    } catch (err) {
      console.warn("Failed to load agent configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentData();
  }, []);

  const handleToggleAgent = async (agent) => {
    const updated = !agent.is_active;
    setAgents((prev) =>
      prev.map((a) => (a.id === agent.id ? { ...a, is_active: updated } : a))
    );
    try {
      await agentAPI.updateConfig(agent.id, { is_active: updated });
    } catch (err) {
      console.warn("Update config failed on backend:", err);
    }
  };

  const handleOpenPrompt = (agent) => {
    setSelectedAgent(agent);
    setSystemPrompt(agent.system_prompt || "");
    setPromptModalOpen(true);
  };

  const handleSavePrompt = async (e) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setAgents((prev) =>
      prev.map((a) => (a.id === selectedAgent.id ? { ...a, system_prompt: systemPrompt } : a))
    );
    try {
      await agentAPI.updateConfig(selectedAgent.id, { system_prompt: systemPrompt });
    } catch (err) {}
    setPromptModalOpen(false);
  };

  const getAgentIcon = (type) => {
    switch (type) {
      case "INVENTORY":
        return <Boxes className="w-5 h-5 text-blue-400" />;
      case "CRM":
        return <Users className="w-5 h-5 text-purple-400" />;
      case "DOCUMENT":
        return <FileText className="w-5 h-5 text-emerald-400" />;
      default:
        return <Workflow className="w-5 h-5 text-violet-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-violet-900/30">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-400" />
            Autonomous AI Agent Orchestration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure agent models, guardrails, controlled Python tools, and inspect execution audit telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="purple" className="gap-1 px-3 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-violet-300" />
            Groq Compound Engine
          </Badge>
        </div>
      </div>

      {/* 4 Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          return (
            <Card
              key={agent.id}
              className="p-5 bg-slate-900/70 border-violet-900/40 hover:border-violet-600/60 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      {getAgentIcon(agent.agent_type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                      <p className="text-[11px] font-mono text-violet-400">{agent.agent_type} AGENT</p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleAgent(agent)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      agent.is_active ? "bg-violet-600" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        agent.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed line-clamp-2">
                  {agent.system_prompt}
                </p>

                {/* Allowed Tools Badge List */}
                <div className="mt-3">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">
                    Authorized Tools & Guardrails
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(agent.allowed_tools || []).map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                      >
                        ⚡ {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono">Model: {agent.model || "groq/compound"}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenPrompt(agent)}
                  className="text-xs py-1 px-2.5 border-violet-900/60 text-violet-300 hover:bg-violet-950"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1" />
                  Edit Directives
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Execution Telemetry & Audit Logs Table */}
      <Card className="bg-slate-900/70 border-violet-900/40 overflow-hidden">
        <div className="p-4 border-b border-violet-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Agent Execution & Tool Telemetry Logs</h3>
          </div>
          <Badge variant="success">RabbitMQ Real-time Stream</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-violet-900/40 text-[10px] uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">User Instruction / Trigger</th>
                <th className="py-3 px-4">Tools Called</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {executions.map((exec) => (
                <tr key={exec.id} className="hover:bg-violet-950/20 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-violet-300">
                    {exec.agent_type}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 max-w-xs truncate">
                    {exec.query}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {(exec.tools_used || []).join(", ") || "none"}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {exec.latency_ms || 600}ms
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={exec.status === "SUCCESS" ? "success" : "danger"}>
                      {exec.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => { setSelectedExecution(exec); setExecModalOpen(true); }}
                      className="p-1.5 text-violet-400 hover:text-white rounded hover:bg-violet-950 transition-colors"
                      title="Inspect execution trace"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* System Prompt Modal */}
      <Modal
        isOpen={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        title={`Configure Directives — ${selectedAgent?.name || ""}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSavePrompt} className="space-y-4">
          <p className="text-xs text-slate-400">
            Define the persona, behavior constraints, and execution style for this autonomous agent.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">System Prompt Directive</label>
            <textarea
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setPromptModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" size="sm">
              Save Directives
            </Button>
          </div>
        </form>
      </Modal>

      {/* Execution Inspection Modal */}
      <Modal
        isOpen={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        title="Agent Execution Trace"
        maxWidth="max-w-lg"
      >
        {selectedExecution && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                <span>AGENT: {selectedExecution.agent_type}</span>
                <span>STATUS: {selectedExecution.status}</span>
              </div>
              <div className="text-white font-medium pt-1">{selectedExecution.query}</div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Agent Response / Structured Synthesis:</span>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-violet-900/40 text-slate-200 leading-relaxed font-sans text-xs">
                {selectedExecution.output}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-1">Tools Invoked:</span>
              <div className="flex flex-wrap gap-1">
                {(selectedExecution.tools_used || []).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-violet-950 border border-violet-800 font-mono text-[10px] text-violet-300">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setExecModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
