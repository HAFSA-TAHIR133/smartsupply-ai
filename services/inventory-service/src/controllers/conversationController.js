import { v4 as uuidv4 } from "uuid";
import { Conversation, Message } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.findAll({
      where: { tenantId: req.tenantId },
      order: [["updatedAt", "DESC"]],
      limit: 30,
    });
    return httpResponse.SUCCESS(res, conversations);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createConversation = async (req, res) => {
  try {
    const { title = "New Conversation", agentId = "supply-chain-agent" } = req.body;
    const conversation = await Conversation.create({
      id: uuidv4(),
      tenantId: req.tenantId,
      userId: req.userId || null,
      title,
      agentId,
    });
    return httpResponse.CREATED(res, conversation);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!conversation) {
      return httpResponse.NOT_FOUND(res, {}, "Conversation not found.");
    }

    const messages = await Message.findAll({
      where: { conversationId: id, tenantId: req.tenantId },
      order: [["createdAt", "ASC"]],
    });

    return httpResponse.SUCCESS(res, { conversation, messages });
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await Conversation.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!conversation) {
      return httpResponse.NOT_FOUND(res, {}, "Conversation not found.");
    }

    await conversation.destroy();
    return httpResponse.SUCCESS(res, {}, "Conversation deleted.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};
