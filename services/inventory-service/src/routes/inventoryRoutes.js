import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustStock,
  getStockHistory,
  deleteProduct,
} from "../controllers/inventoryController.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { uploadProductImage } from "../middleware/upload.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

const router = Router();

router.use(authMiddleware);

const handleUpload = (req, res, next) => {
  uploadProductImage(req, res, (err) => {
    if (err) {
      return httpResponse.BAD_REQUEST(res, {}, err.message || "Image upload failed");
    }
    next();
  });
};

router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.post("/", requireRole(["ADMIN", "MANAGER"]), handleUpload, createProduct);
router.put("/:id", requireRole(["ADMIN", "MANAGER"]), handleUpload, updateProduct);
router.post("/:id/stock", requireRole(["ADMIN", "MANAGER"]), adjustStock);
router.get("/:id/history", getStockHistory);
router.delete("/:id", requireRole(["ADMIN"]), deleteProduct);

export default router;
