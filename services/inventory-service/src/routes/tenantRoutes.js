import { Router } from "express";
import { createTenant, getAllTenants } from "../controllers/tenantController.js";

const router = Router();

router.post("/", createTenant);
router.get("/", getAllTenants);

export default router;