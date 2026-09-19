import * as productService from "../services/productService.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";
import { ErrorCodesMeta } from "../../../../packages/shared/constants/error-codes.js";


export const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.tenantId);
    return httpResponse.SUCCESS(res, products);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.tenantId, req.params.id);

    if (!product) {
      return httpResponse.NOT_FOUND(res, {}, ErrorCodesMeta.PRODUCT_NOT_FOUND.message);
    }

    return httpResponse.SUCCESS(res, product);
  } catch (error) {
    console.error("getProductById error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createProduct = async (req, res) => {
  try {
    const { sku, name, description, quantity, reorderPoint, unitPrice } = req.body;

    if (!sku || !name) {
      return httpResponse.BAD_REQUEST(res, {}, "sku and name are required");
    }

    const productData = {
      sku,
      name,
      description: description || null,
      quantity: quantity ? Number(quantity) : 0,
      reorderPoint: reorderPoint ? Number(reorderPoint) : 10,
      unitPrice: unitPrice ? Number(unitPrice) : 0,
    };

    // If image was uploaded
    if (req.file) {
      productData.imageUrl = req.file.path;
      productData.imagePublicId = req.file.filename;
    }

    const product = await productService.createProduct(req.tenantId, productData);

    return httpResponse.CREATED(res, product, "Product created successfully");
  } catch (error) {
    console.error("createProduct error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      return httpResponse.CONFLICT(res, {}, ErrorCodesMeta.DUPLICATE_SKU.message);
    }

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return httpResponse.BAD_REQUEST(res, {}, "Invalid tenantId. Tenant does not exist.");
    }

    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { sku, name, description, quantity, reorderPoint, unitPrice } = req.body;

    const updateData = {};

    if (sku !== undefined) updateData.sku = sku;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (reorderPoint !== undefined) updateData.reorderPoint = Number(reorderPoint);
    if (unitPrice !== undefined) updateData.unitPrice = Number(unitPrice);

    // If new image uploaded
    if (req.file) {
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
    }

    const updatedProduct = await productService.updateProduct(
      req.tenantId,
      req.params.id,
      updateData
    );

    if (!updatedProduct) {
      return httpResponse.NOT_FOUND(res, {}, ErrorCodesMeta.PRODUCT_NOT_FOUND.message);
    }

    return httpResponse.SUCCESS(res, updatedProduct, "Product updated successfully");
  }  catch (error) {
  console.error("========== UPDATE PRODUCT ERROR ==========");
  console.error(error);                     // full error object
  console.error("Error name:", error.name);
  console.error("Error message:", error.message);
  if (error.http_code) console.error("Cloudinary http_code:", error.http_code);
  console.error("==========================================");

  if (error.name === "SequelizeUniqueConstraintError") {
    return httpResponse.CONFLICT(res, {}, ErrorCodesMeta.DUPLICATE_SKU.message);
  }

  return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message || "Internal Server Error");
}
};

export const deleteProduct = async (req, res) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const result = await productService.deleteProduct(tenantId, id);

    // If service returns null/false/undefined, product was not found
    if (!result) {
      return httpResponse.NOT_FOUND(res, "Product not found");
    }

    return httpResponse.SUCCESS(res, {}, "Product deleted successfully");
  } catch (error) {
    console.error("deleteProduct error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};