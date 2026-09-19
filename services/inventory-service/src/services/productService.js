import { Product } from "../db/models/index.js";
import { publishEvent } from "../events/publisher.js";

export const createProduct = async (tenantId, data) => {
  const product = await Product.create({
    tenantId,
    ...data,
  });

  // Publish event to trigger Agent Orchestrator / Forecasting
  await publishEvent("inventory.product.created", {
    tenantId,
    productId: product.id,
    sku: product.sku,
    quantity: product.quantity,
    reorderPoint: product.reorderPoint,
  });

  return product;
};

export const getAllProducts = async (tenantId) => {
  return await Product.findAll({
    where: { tenantId },
    order: [["createdAt", "DESC"]],
  });
};

export const getProductById = async (tenantId, productId) => {
  return await Product.findOne({
    where: {
      id: productId,
      tenantId,
    },
  });
};

export const updateProduct = async (tenantId, productId, data) => {
  const product = await Product.findOne({
    where: {
      id: productId,
      tenantId,
    },
  });

  if (!product) return null;

  const previousQuantity = product.quantity;
  await product.update(data);

  // Publish inventory updated event
  await publishEvent("inventory.product.updated", {
    tenantId,
    productId: product.id,
    sku: product.sku,
    oldQuantity: previousQuantity,
    newQuantity: product.quantity,
    reorderPoint: product.reorderPoint,
    isLowStock: product.quantity <= product.reorderPoint,
  });

  return product;
};

export const deleteProduct = async (tenantId, productId) => {
  const product = await Product.findOne({
    where: {
      id: productId,
      tenantId,
    },
  });

  if (!product) return null;

  await product.destroy();

  await publishEvent("inventory.product.deleted", {
    tenantId,
    productId,
  });

  return true;
};