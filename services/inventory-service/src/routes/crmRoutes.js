import { Router } from "express";
import {
  getLeads,
  createLead,
  updateLeadStage,
  deleteLead,
  getPipeline,
  getCustomers,
  createCustomer,
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getActivities,
} from "../controllers/crmController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

// Leads
router.get("/leads", getLeads);
router.post("/leads", requireRole(["ADMIN", "MANAGER"]), createLead);
router.put("/leads/:id/stage", requireRole(["ADMIN", "MANAGER"]), updateLeadStage);
router.delete("/leads/:id", requireRole(["ADMIN"]), deleteLead);

// Pipeline
router.get("/pipelines", getPipeline);

// Customers
router.get("/customers", getCustomers);
router.post("/customers", requireRole(["ADMIN", "MANAGER"]), createCustomer);

// Tasks
router.get("/tasks", getTasks);
router.post("/tasks", createTask);
router.put("/tasks/:id/status", updateTaskStatus);
router.delete("/tasks/:id", deleteTask);

// Activities
router.get("/activities", getActivities);

export default router;
