import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/stats", getDashboardStats);

export default router;
