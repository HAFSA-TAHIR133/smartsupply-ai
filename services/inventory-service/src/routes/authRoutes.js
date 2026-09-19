import { Router } from "express";
import {
  signup,
  login,
  demoLogin,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/demo", demoLogin);
router.get("/me", authMiddleware, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
