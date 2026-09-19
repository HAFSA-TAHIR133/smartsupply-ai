"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  X,
  FileText,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Check,
  AlertCircle,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useAuthContext } from "@/context/authContext";

const AGENT_OPTIONS = [
  { id: "supply-chain-agent", name: "Supply Chain Master", icon: Sparkles, desc: "Autonomous cross-domain strategist" },
  { id: "inventory-agent", name: "Inventory Agent", icon: Layers, desc: "Stock alerts, reorder calculations" },
  { id: "crm-agent", name: "CRM Agent", icon: Cpu, desc: "Deals, leads & customer pipelines" },
  { id: "document-agent", name: "Document / RAG", icon: BookOpen, desc: "Authoritative contract citations" },
];

export function AIAssistantDrawer({ isOpen, onClose }) {
  const { user } = useAuthContext();
  const [selectedAgent, setSelectedAgent] = useState("supply-chain-agent");
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  const handleApproveAction = async (actionId, msgIndex) => {
    setActionLoading(actionId);
    try {
      const result = await apiRequest(`/agents/actions/${actionId}/approve`, {
        method: "POST",
      });
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === msgIndex
            ? {
                ...m,
                pendingAction: { ...m.pendingAction, status: "APPROVED" },
                executionResult: result,
              }
            : m
        )
      );
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAction = async (actionId, msgIndex) => {
    setActionLoading(actionId);
    try {
      const result = await apiRequest(`/agents/actions/${actionId}/reject`, {
        method: "POST",
      });
      setMessages((prev) =>
        prev.map((m, idx) =>
          idx === msgIndex
            ? {
                ...m,
                pendingAction: { ...m.pendingAction, status: "REJECTED" },
              }
            : m
        )
      );
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const convs = await apiRequest("/conversations");
      setConversations(convs || []);
      if (convs && convs.length > 0 && !activeConvId) {
        selectConversation(convs[0].id);
      } else if (!activeConvId) {
        startNewConversation();
      }
    } catch (e) {
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            sender: "AGENT",
            content: "Hello! I am your **SmartSupply AI Assistant**. How can I help optimize your inventory, CRM deals, or review supplier agreements today?",
            sources: [],
          },
        ]);
      }
    }
  };

  const selectConversation = async (convId) => {
    setActiveConvId(convId);
    try {
      const data = await apiRequest(`/conversations/${convId}/messages`);
      if (data && data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.warn("Could not load messages for conversation:", convId);
    }
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "AGENT",
        content: `Connected to **${AGENT_OPTIONS.find(a => a.id === selectedAgent)?.name}**. Ask me anything regarding live warehouse stock, customer deals, or contract terms.`,
        sources: [],
      },
    ]);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage("");

    const tempUserMsg = {
      id: `user-${Date.now()}`,
      sender: "USER",
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await apiRequest(`/agents/${selectedAgent}/chat`, {
        method: "POST",
        body: {
          message: userText,
          conversationId: activeConvId,
        },
      });

      if (response.conversationId && !activeConvId) {
        setActiveConvId(response.conversationId);
      }

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "AGENT",
        content: response.answer || "Processed your request.",
        sources: response.sources || [],
        toolsUsed: response.toolsUsed || [],
        executionTimeMs: response.executionTimeMs,
        requiresConfirmation: Boolean(response.requiresConfirmation),
        pendingAction: response.pendingAction || null,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "AGENT",
          content: `⚠️ Error executing agent request: ${err.message}`,
          sources: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSourceExpand = (msgIndex, sourceIndex) => {
    const key = `${msgIndex}-${sourceIndex}`;
    setExpandedSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-screen max-w-md border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                      SmartSupply AI Assistant
                    </h2>
                    <p className="text-[11px] text-zinc-400">Autonomous Assistant Engine</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={startNewConversation}
                    title="New Session"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                  const isUser = msg.sender === "USER";
                  return (
                    <div
                      key={msg.id || index}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                          isUser
                            ? "bg-indigo-600 text-white"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                        </div>

                        {/* Human-in-the-loop Pending Action Card */}
                        {msg.pendingAction && (
                          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-zinc-100">
                            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                                <ShieldAlert className="h-3.5 w-3.5" />
                                <span>Confirmation Required</span>
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                msg.pendingAction.status === "APPROVED"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : msg.pendingAction.status === "REJECTED"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}>
                                {msg.pendingAction.status}
                              </span>
                            </div>

                            <div className="py-2 text-[11px] space-y-1">
                              <p className="font-medium text-zinc-200">{msg.pendingAction.summary}</p>
                              {msg.pendingAction.targetEntity && (
                                <div className="text-[10px] text-zinc-400 flex flex-wrap gap-x-3">
                                  {msg.pendingAction.targetEntity.sku && <span>SKU: <strong className="text-zinc-300">{msg.pendingAction.targetEntity.sku}</strong></span>}
                                  {msg.pendingAction.params?.quantity && <span>Qty: <strong className="text-zinc-300">{msg.pendingAction.params.quantity}</strong></span>}
                                  {msg.pendingAction.params?.changeType && <span>Type: <strong className="text-zinc-300">{msg.pendingAction.params.changeType}</strong></span>}
                                </div>
                              )}
                            </div>

                            {msg.pendingAction.status === "PENDING" && (
                              <div className="mt-2 pt-2 border-t border-amber-500/20 flex gap-2">
                                <button
                                  onClick={() => handleApproveAction(msg.pendingAction.id, index)}
                                  disabled={actionLoading === msg.pendingAction.id}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-[11px] transition-colors shadow-sm"
                                >
                                  {actionLoading === msg.pendingAction.id ? (
                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="h-3.5 w-3.5" />
                                      <span>Approve & Execute</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectAction(msg.pendingAction.id, index)}
                                  disabled={actionLoading === msg.pendingAction.id}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md bg-zinc-800 hover:bg-rose-900/60 hover:text-rose-300 disabled:opacity-50 text-zinc-300 font-medium text-[11px] transition-colors border border-zinc-700"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}

                            {msg.pendingAction.status === "APPROVED" && (
                              <div className="mt-1 text-[10px] text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                <span>Action verified and executed successfully.</span>
                              </div>
                            )}

                            {msg.pendingAction.status === "REJECTED" && (
                              <div className="mt-1 text-[10px] text-rose-400 flex items-center gap-1">
                                <X className="h-3 w-3" />
                                <span>Action cancelled. No changes were made.</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tools Used */}
                        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-zinc-800/60 flex flex-wrap gap-1 items-center">
                            <span className="text-[10px] text-zinc-400">Tools:</span>
                            {msg.toolsUsed.map((tool, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                                {tool}()
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Sources Citations */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                            <p className="text-[10px] font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                              <BookOpen className="h-3 w-3 text-indigo-400" />
                              Sources ({msg.sources.length})
                            </p>
                            <div className="space-y-1">
                              {msg.sources.map((src, sIdx) => {
                                const isExp = expandedSources[`${index}-${sIdx}`];
                                return (
                                  <div
                                    key={sIdx}
                                    className="rounded bg-zinc-950 border border-zinc-800 p-1.5 text-[11px]"
                                  >
                                    <div
                                      onClick={() => toggleSourceExpand(index, sIdx)}
                                      className="flex items-center justify-between cursor-pointer font-medium text-zinc-300 hover:text-indigo-400"
                                    >
                                      <span className="truncate flex items-center gap-1">
                                        <FileText className="h-3 w-3 text-zinc-400 shrink-0" />
                                        {src.document} (p. {src.page})
                                      </span>
                                      {isExp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </div>
                                    {isExp && src.snippet && (
                                      <p className="mt-1 pt-1 border-t border-zinc-800 text-[10px] text-zinc-400 italic">
                                        "{src.snippet}"
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span>AI processing request...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-zinc-800 bg-zinc-900/40">
                {[
                  "Which products need restocking?",
                  "Show top CRM deals",
                  "Supplier lead times",
                ].map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => setInputMessage(promptText)}
                    className="shrink-0 text-[10px] py-1 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Drawer Footer Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Ask ${AGENT_OPTIONS.find(a => a.id === selectedAgent)?.name}...`}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || loading}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
