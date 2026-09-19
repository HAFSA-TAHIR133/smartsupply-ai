import { v4 as uuidv4 } from "uuid";
import { Agent, AgentExecution, Conversation, Message, PendingAction } from "../db/models/index.js";
import { dispatchAgentQuery } from "../services/agentQueueService.js";
import {
  analyzeAgentIntent,
  createPendingAction,
  executePendingAction,
} from "../services/agentOrchestratorService.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";

export const getAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      where: { tenantId: req.tenantId },
      order: [["name", "ASC"]],
    });

    return httpResponse.SUCCESS(res, agents);
  } catch (error) {
    console.error("getAgents error:", error);
    newrelicHelper.noticeError(error, { endpoint: "getAgents", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const updateAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled, allowedTools, systemPrompt, description } = req.body;

    const agent = await Agent.findOne({ where: { id, tenantId: req.tenantId } });
    if (!agent) {
      return httpResponse.NOT_FOUND(res, {}, "Agent not found.");
    }

    const updateData = {};
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (allowedTools !== undefined) updateData.allowedTools = allowedTools;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (description !== undefined) updateData.description = description;

    await agent.update(updateData);
    return httpResponse.SUCCESS(res, agent, "Agent configuration updated.");
  } catch (error) {
    newrelicHelper.noticeError(error, { endpoint: "updateAgent", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const getExecutions = async (req, res) => {
  try {
    const executions = await AgentExecution.findAll({
      where: { tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    return httpResponse.SUCCESS(res, executions);
  } catch (error) {
    newrelicHelper.noticeError(error, { endpoint: "getExecutions", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const chatWithAgent = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id: agentId } = req.params;
    const { message, conversationId } = req.body;

    if (!message || !message.trim()) {
      return httpResponse.BAD_REQUEST(res, {}, "Message is required.");
    }

    // Check if agent is enabled
    const agentRecord = await Agent.findOne({ where: { id: agentId, tenantId: req.tenantId } });
    if (agentRecord && !agentRecord.isEnabled) {
      return httpResponse.FORBIDDEN(res, {}, `Agent '${agentRecord.name}' is currently disabled.`);
    }

    let activeConversationId = conversationId;
    let history = [];

    if (activeConversationId) {
      const conv = await Conversation.findOne({ where: { id: activeConversationId, tenantId: req.tenantId } });
      if (conv) {
        const prevMsgs = await Message.findAll({
          where: { conversationId: activeConversationId, tenantId: req.tenantId },
          order: [["createdAt", "ASC"]],
          limit: 6,
        });
        history = prevMsgs.map((m) => ({
          role: m.sender === "USER" ? "user" : "assistant",
          content: m.content,
        }));
      }
    } else {
      const newConv = await Conversation.create({
        id: uuidv4(),
        tenantId: req.tenantId,
        userId: req.user.id || null,
        title: message.substring(0, 40) + "...",
        agentId,
      });
      activeConversationId = newConv.id;
    }

    // Save user message
    await Message.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      conversationId: activeConversationId,
      sender: "USER",
      content: message,
    });

    // 1. Analyze user intent (Classify Read vs Write)
    const intent = await analyzeAgentIntent({
      message,
      tenantId: req.tenantId,
      userId: req.user.id,
    });

    // 2. If WRITE action: Create Pending Action and return confirmation card
    if (intent.isWrite) {
      const pendingAction = await createPendingAction({
        tenantId: req.tenantId,
        userId: req.user.id,
        actionType: intent.actionType,
        targetEntity: intent.targetEntity,
        params: intent.params,
        summary: intent.summary,
      });

      const responseText = `I have prepared the following action: **${intent.summary}**.\n\nPlease review the details below and confirm to proceed.`;

      const botMsg = await Message.create({
        id: uuidv4(),
        tenantId: req.tenantId,
        conversationId: activeConversationId,
        sender: "AGENT",
        content: responseText,
        metadata: {
          requiresConfirmation: true,
          pendingActionId: pendingAction.id,
          pendingAction,
          executionTimeMs: Date.now() - startTime,
        },
      });

      return httpResponse.SUCCESS(res, {
        conversationId: activeConversationId,
        message: botMsg,
        answer: responseText,
        requiresConfirmation: true,
        pendingAction,
        executionTimeMs: Date.now() - startTime,
      });
    }

    // 3. If READ action: Return immediately without confirmation gate
    if (intent.answer) {
      const executionTimeMs = Date.now() - startTime;
      const botMsg = await Message.create({
        id: uuidv4(),
        tenantId: req.tenantId,
        conversationId: activeConversationId,
        sender: "AGENT",
        content: intent.answer,
        metadata: {
          isRead: true,
          actionType: intent.actionType,
          data: intent.data,
          executionTimeMs,
        },
      });

      newrelicHelper.recordAgentTaskEvent({
        actionType: intent.actionType,
        durationMs: executionTimeMs,
        success: true,
        userId: req.user.id,
        tenantId: req.tenantId,
        status: "COMPLETED",
      });

      return httpResponse.SUCCESS(res, {
        conversationId: activeConversationId,
        message: botMsg,
        answer: intent.answer,
        data: intent.data,
        requiresConfirmation: false,
        executionTimeMs,
      });
    }

    // 4. Fallback to LLM / Agent Queue
    const agentResult = await dispatchAgentQuery({
      tenantId: req.tenantId,
      userId: req.user.id,
      conversationId: activeConversationId,
      agentId,
      message,
      history,
    });

    const executionTimeMs = Date.now() - startTime;

    const botMsg = await Message.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      conversationId: activeConversationId,
      sender: "AGENT",
      content: agentResult.answer || "No response generated.",
      sources: agentResult.sources || [],
      metadata: {
        agent: agentId,
        toolsUsed: agentResult.toolsUsed || [],
        executionTimeMs,
      },
    });

    await AgentExecution.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      agentId,
      requestId: agentResult.requestId || uuidv4(),
      prompt: message,
      response: agentResult.answer,
      toolsUsed: agentResult.toolsUsed || [],
      executionTimeMs,
      status: agentResult.status || "SUCCESS",
    });

    newrelicHelper.recordAgentTaskEvent({
      actionType: "general_query",
      durationMs: executionTimeMs,
      success: true,
      userId: req.user.id,
      tenantId: req.tenantId,
      status: "COMPLETED",
    });

    return httpResponse.SUCCESS(res, {
      conversationId: activeConversationId,
      message: botMsg,
      answer: agentResult.answer,
      sources: agentResult.sources || [],
      toolsUsed: agentResult.toolsUsed || [],
      executionTimeMs,
    });
  } catch (error) {
    console.error("chatWithAgent error:", error);
    newrelicHelper.noticeError(error, { endpoint: "chatWithAgent", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

/**
 * Approves a pending write action, marks it consumed, and executes it.
 */
export const approvePendingAction = async (req, res) => {
  const startTime = Date.now();
  try {
    const { id } = req.params;

    const action = await PendingAction.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!action) {
      return httpResponse.NOT_FOUND(res, {}, "Pending action not found.");
    }

    if (action.status !== "PENDING") {
      return httpResponse.BAD_REQUEST(
        res,
        {},
        `Action cannot be approved because it is already '${action.status}'.`
      );
    }

    if (new Date() > new Date(action.expiresAt)) {
      await action.update({ status: "EXPIRED" });
      return httpResponse.BAD_REQUEST(
        res,
        {},
        "Action has expired (15-minute window passed). Please request a new action."
      );
    }

    // Execute via unified write gate
    const executionResult = await executePendingAction(action, req.user);

    await action.update({
      status: "APPROVED",
      executedAt: new Date(),
      executionResult,
    });

    const durationMs = Date.now() - startTime;
    newrelicHelper.recordAgentTaskEvent({
      actionType: action.actionType,
      durationMs,
      success: true,
      userId: req.user.id,
      tenantId: req.tenantId,
      status: "APPROVED",
    });

    return httpResponse.SUCCESS(res, {
      actionId: action.id,
      status: "APPROVED",
      result: executionResult,
      message: executionResult?.message || "Action approved and executed successfully.",
    });
  } catch (error) {
    console.error("approvePendingAction error:", error);
    newrelicHelper.noticeError(error, { endpoint: "approvePendingAction", actionId: req.params.id });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

/**
 * Rejects and cancels a pending write action.
 */
export const rejectPendingAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const action = await PendingAction.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!action) {
      return httpResponse.NOT_FOUND(res, {}, "Pending action not found.");
    }

    if (action.status !== "PENDING") {
      return httpResponse.BAD_REQUEST(
        res,
        {},
        `Action is already '${action.status}' and cannot be cancelled.`
      );
    }

    await action.update({
      status: "REJECTED",
      executedAt: new Date(),
      executionResult: { reason: reason || "Cancelled by user" },
    });

    newrelicHelper.recordAgentTaskEvent({
      actionType: action.actionType,
      durationMs: 0,
      success: false,
      userId: req.user.id,
      tenantId: req.tenantId,
      status: "REJECTED",
    });

    return httpResponse.SUCCESS(res, {
      actionId: action.id,
      status: "REJECTED",
      message: `Action '${action.summary}' was cancelled.`,
    });
  } catch (error) {
    console.error("rejectPendingAction error:", error);
    newrelicHelper.noticeError(error, { endpoint: "rejectPendingAction", actionId: req.params.id });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};
