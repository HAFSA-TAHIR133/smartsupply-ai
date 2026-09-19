import { Router } from "express";
import {
  getAgents,
  updateAgent,
  getExecutions,
  chatWithAgent,
  approvePendingAction,
  rejectPendingAction,
} from "../controllers/agentController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getAgents);
router.put("/:id", requireRole(["ADMIN"]), updateAgent);
router.get("/executions", getExecutions);
router.post("/:id/chat", chatWithAgent);

// Human-In-The-Loop Approval and Rejection Routes
router.post("/actions/:id/approve", approvePendingAction);
router.post("/actions/:id/reject", rejectPendingAction);

export default router;
