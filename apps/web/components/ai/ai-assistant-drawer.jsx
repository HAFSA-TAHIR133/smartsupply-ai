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

const AGENT_OPTIONS = [
  { id: "supply-chain-agent", name: "Supply Chain Master", icon: Sparkles, desc: "Autonomous cross-domain strategist" },
  { id: "inventory-agent", name: "Inventory Agent", icon: Layers, desc: "Stock alerts, reorder calculations" },
  { id: "crm-agent", name: "CRM Agent", icon: Cpu, desc: "Deals, leads & customer pipelines" },
  { id: "document-agent", name: "Document / RAG", icon: BookOpen, desc: "Authoritative contract citations" },
];

export function AIAssistantDrawer({ isOpen, onClose }) {
  const { user, isDemo } = useAuthContext();
  const [selectedAgent, setSelectedAgent] = useState("supply-chain-agent");
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("smartsupply:data-updated", {
            detail: { actionId, result },
          })
        );
      }
    } catch (err) {
      console.error("Approval failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "AGENT",
          content: `⚠️ Approval failed: ${err.message}`,
          sources: [],
        },
      ]);
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
      console.error("Rejection failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "AGENT",
          content: `⚠️ Rejection failed: ${err.message}`,
          sources: [],
        },
      ]);
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

      if (response.executedAction || response.pendingAction?.status === "APPROVED") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("smartsupply:data-updated", {
              detail: { actionId: response.pendingAction?.id, result: response.pendingAction?.result },
            })
          );
        }
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

      setMessages((prev) => {
        // If an action was just approved conversational-style, mark any older pending actions as approved too
        if (response.executedAction || response.pendingAction?.status === "APPROVED") {
          return prev.map((m) =>
            m.pendingAction && (m.pendingAction.status === "PENDING" || m.pendingAction.status === "PENDING_CONFIRMATION")
              ? { ...m, pendingAction: { ...m.pendingAction, status: "APPROVED" } }
              : m
          ).concat(botMsg);
        }
        return [...prev, botMsg];
      });
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
              <div className="p-4 border-b border-zinc-800 bg-zinc-900 space-y-2">
                <div className="flex items-center justify-between">
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
                      onClick={() => setResetDialogOpen(true)}
                      title="Reset Conversation"
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

                {/* Subheader: Mode & Model badges */}
                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full font-mono font-medium border ${
                      isDemo
                        ? "bg-amber-950/60 text-amber-300 border-amber-500/30"
                        : "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {isDemo ? "● DEMO SANDBOX" : "● LIVE ENTERPRISE"}
                  </span>
                  <span className="text-zinc-500 font-mono">
                    Model: <strong className="text-zinc-300">groq/compound</strong>
                  </span>
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
                          <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-zinc-100 shadow-sm">
                            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                              <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                                <ShieldAlert className="h-4 w-4" />
                                <span>Human Confirmation Required</span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  msg.pendingAction.status === "APPROVED"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : msg.pendingAction.status === "REJECTED"
                                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                                }`}
                              >
                                {msg.pendingAction.status === "APPROVED"
                                  ? "APPROVED"
                                  : msg.pendingAction.status === "REJECTED"
                                  ? "REJECTED"
                                  : "AWAITING CONFIRMATION"}
                              </span>
                            </div>

                            <div className="py-2.5 text-xs space-y-1.5">
                              <p className="font-semibold text-zinc-100">
                                {msg.pendingAction.title || "Staged Operation"}
                              </p>
                              <p className="text-zinc-300 text-[11px] leading-relaxed">
                                {msg.pendingAction.summary}
                              </p>

                              {/* Details breakdown */}
                              {msg.pendingAction.payload && (
                                <div className="mt-2 p-2 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] space-y-1 font-mono">
                                  {msg.pendingAction.payload.productName && (
                                    <div className="text-zinc-300 flex justify-between">
                                      <span className="text-zinc-500 font-sans">Item:</span>
                                      <span className="font-medium text-white">
                                        {msg.pendingAction.payload.productName}
                                      </span>
                                    </div>
                                  )}
                                  {msg.pendingAction.payload.sku && (
                                    <div className="text-zinc-300 flex justify-between">
                                      <span className="text-zinc-500 font-sans">SKU:</span>
                                      <span className="text-amber-300">
                                        {msg.pendingAction.payload.sku}
                                      </span>
                                    </div>
                                  )}
                                  {msg.pendingAction.payload.quantityDelta && (
                                    <div className="text-zinc-300 flex justify-between">
                                      <span className="text-zinc-500 font-sans">Adjustment:</span>
                                      <span className="text-emerald-400 font-bold">
                                        +{msg.pendingAction.payload.quantityDelta} units
                                      </span>
                                    </div>
                                  )}
                                  {msg.pendingAction.payload.updates && (
                                    <div className="text-zinc-300">
                                      <span className="text-zinc-500 font-sans block mb-0.5">
                                        Requested Updates:
                                      </span>
                                      <div className="pl-2 border-l border-zinc-700 space-y-0.5">
                                        {Object.entries(msg.pendingAction.payload.updates).map(
                                          ([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                              <span className="text-zinc-400">{k}:</span>
                                              <span className="text-indigo-300">{String(v)}</span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {(msg.pendingAction.status === "PENDING" ||
                              msg.pendingAction.status === "PENDING_CONFIRMATION") && (
                              <div className="mt-2 pt-2 border-t border-amber-500/20 flex gap-2">
                                <button
                                  onClick={() => handleApproveAction(msg.pendingAction.id, index)}
                                  disabled={actionLoading === msg.pendingAction.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                                >
                                  {actionLoading === msg.pendingAction.id ? (
                                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4" />
                                      <span>Confirm & Proceed</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleRejectAction(msg.pendingAction.id, index)}
                                  disabled={actionLoading === msg.pendingAction.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-zinc-800 hover:bg-rose-950 hover:border-rose-700/50 hover:text-rose-300 disabled:opacity-50 text-zinc-300 font-medium text-xs transition-colors border border-zinc-700 cursor-pointer"
                                >
                                  <X className="h-4 w-4" />
                                  <span>Decline</span>
                                </button>
                              </div>
                            )}

                            {msg.pendingAction.status === "APPROVED" && (
                              <div className="mt-2 pt-2 border-t border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                                <Check className="h-4 w-4 text-emerald-400" />
                                <span>Confirmed & executed successfully!</span>
                              </div>
                            )}

                            {msg.pendingAction.status === "REJECTED" && (
                              <div className="mt-2 pt-2 border-t border-rose-500/20 text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                                <X className="h-4 w-4 text-rose-400" />
                                <span>Operation declined. No changes were made.</span>
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

          {/* Shadcn UI AlertDialog for Session Reset */}
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-zinc-100">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Reset AI Assistant Session?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear the current dialogue history and start a fresh agent session.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    startNewConversation();
                    setResetDialogOpen(false);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Start New Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AnimatePresence>
  );
}
