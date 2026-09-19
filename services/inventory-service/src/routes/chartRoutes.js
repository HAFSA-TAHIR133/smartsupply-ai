import { Router } from "express";
import { getCharts, createChart, deleteChart } from "../controllers/chartController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// Protect all chart endpoints with authenticated tenant session
router.use(authMiddleware);

router.get("/", getCharts);
router.post("/", createChart);
router.delete("/:id", deleteChart);

export default router;
