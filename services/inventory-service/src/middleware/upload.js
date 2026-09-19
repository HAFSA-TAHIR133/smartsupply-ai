import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "smartsupply/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const uploadProductImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("image");