import { Router } from "express";
import {
  getConversations,
  createConversation,
  getMessages,
  deleteConversation,
} from "../controllers/conversationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getConversations);
router.post("/", createConversation);
router.get("/:id/messages", getMessages);
router.delete("/:id", deleteConversation);

export default router;
