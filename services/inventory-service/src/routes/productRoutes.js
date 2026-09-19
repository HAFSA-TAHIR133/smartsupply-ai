import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productControllers.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { uploadProductImage } from "../middleware/upload.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

const router = Router();

router.use(tenantMiddleware);

// Helper to handle multer errors
const handleUpload = (req, res, next) => {
  uploadProductImage(req, res, (err) => {
    if (err) {
      console.error("========== UPLOAD ERROR ==========");
      console.error(err);
      console.error("==================================");

      return httpResponse.BAD_REQUEST(res, {}, err.message || "Image upload failed");
    }
    next();
  });
};

router.post("/", handleUpload, createProduct);
router.get("/", getAllProducts);
router.get("/:id", getProductById);
router.put("/:id", handleUpload, updateProduct);
router.delete("/:id", deleteProduct);

export default router;