import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import { Product, StockLog, Notification } from "../db/models/index.js";
import { publishEvent } from "../events/publisher.js";
import { executeWithWriteGate } from "../utils/writeGate.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

export const getAllProducts = async (req, res) => {
  try {
    const { search, category, stockLevel, page = 1, limit = 20, sort = "createdAt", order = "DESC" } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { tenantId: req.tenantId };

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (category && category !== "All") {
      where.category = { [Op.iLike]: `%${category}%` };
    }

    if (stockLevel === "low") {
      where[Op.and] = [
        { quantity: { [Op.gt]: 0 } },
        Product.sequelize.literal(`"quantity" <= "reorderPoint"`),
      ];
    } else if (stockLevel === "out") {
      where.quantity = { [Op.lte]: 0 };
    } else if (stockLevel === "in") {
      where[Op.and] = [
        Product.sequelize.literal(`"quantity" > "reorderPoint"`),
      ];
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sort, order.toUpperCase()]],
    });

    return httpResponse.SUCCESS(res, {
      items: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error("getAllProducts error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, tenantId: req.tenantId },
      include: [{ model: StockLog, as: "stockLogs", limit: 10, order: [["createdAt", "DESC"]] }],
    });

    if (!product) {
      return httpResponse.NOT_FOUND(res, {}, "Product not found.");
    }

    return httpResponse.SUCCESS(res, product);
  } catch (error) {
    console.error("getProductById error:", error);
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const createProduct = async (req, res) => {
  try {
    const { sku, name, category, description, quantity, reorderPoint, unitPrice, supplierEmail, imageUrl } = req.body;

    if (!sku || !name) {
      return httpResponse.BAD_REQUEST(res, {}, "SKU and product name are required.");
    }

    const initialQty = parseInt(quantity || 0);

    const product = await executeWithWriteGate(
      req.user,
      async (transaction) => {
        const prod = await Product.create(
          {
            id: uuidv4(),
            tenantId: req.tenantId,
            sku: sku.trim().toUpperCase(),
            name: name.trim(),
            category: category || "General",
            description: description || null,
            quantity: initialQty,
            reorderPoint: parseInt(reorderPoint || 10),
            unitPrice: parseFloat(unitPrice || 0),
            supplierEmail: supplierEmail || null,
            imageUrl: imageUrl || req.file?.path || null,
            imagePublicId: req.file?.filename || null,
          },
          { transaction }
        );

        if (initialQty > 0) {
          await StockLog.create(
            {
              id: uuidv4(),
              tenantId: req.tenantId,
              productId: prod.id,
              changeType: "IN",
              quantityChanged: initialQty,
              previousQuantity: 0,
              newQuantity: initialQty,
              reason: "Initial catalog entry",
              performedBy: req.user?.name || "System Admin",
            },
            { transaction }
          );
        }

        await publishEvent("inventory.product.created", {
          tenantId: req.tenantId,
          productId: prod.id,
          sku: prod.sku,
          quantity: prod.quantity,
          reorderPoint: prod.reorderPoint,
          isLowStock: prod.quantity <= prod.reorderPoint,
        });

        return prod;
      },
      { actionType: "create_product", tenantId: req.tenantId }
    );

    return httpResponse.CREATED(res, product, "Product created successfully.");
  } catch (error) {
    console.error("createProduct error:", error);
    newrelicHelper.noticeError(error, { endpoint: "createProduct", tenantId: req.tenantId });
    if (error.name === "SequelizeUniqueConstraintError") {
      return httpResponse.CONFLICT(res, {}, "A product with this SKU already exists for this tenant.");
    }
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!product) {
      return httpResponse.NOT_FOUND(res, {}, "Product not found.");
    }

    const { sku, name, category, description, quantity, reorderPoint, unitPrice, supplierEmail, imageUrl } = req.body;

    const updateData = {};
    if (sku) updateData.sku = sku.trim().toUpperCase();
    if (name) updateData.name = name.trim();
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (reorderPoint !== undefined) updateData.reorderPoint = parseInt(reorderPoint);
    if (unitPrice !== undefined) updateData.unitPrice = parseFloat(unitPrice);
    if (supplierEmail !== undefined) updateData.supplierEmail = supplierEmail;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (req.file) {
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
    }

    const updated = await executeWithWriteGate(
      req.user,
      async (transaction) => {
        await product.update(updateData, { transaction });
        return product;
      },
      { actionType: "update_product", tenantId: req.tenantId }
    );

    return httpResponse.SUCCESS(res, updated, "Product updated successfully.");
  } catch (error) {
    console.error("updateProduct error:", error);
    newrelicHelper.noticeError(error, { endpoint: "updateProduct", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, quantity, reason } = req.body; // changeType: 'IN', 'OUT', 'ADJUSTMENT'

    if (!changeType || quantity === undefined) {
      return httpResponse.BAD_REQUEST(res, {}, "changeType and quantity are required.");
    }

    const product = await Product.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!product) {
      return httpResponse.NOT_FOUND(res, {}, "Product not found.");
    }

    const prevQty = product.quantity;
    const qtyDelta = parseInt(quantity);
    let newQty = prevQty;

    if (changeType === "IN") {
      newQty = prevQty + Math.abs(qtyDelta);
    } else if (changeType === "OUT") {
      newQty = Math.max(0, prevQty - Math.abs(qtyDelta));
    } else {
      newQty = Math.max(0, qtyDelta);
    }

    const actualDelta = newQty - prevQty;

    const result = await executeWithWriteGate(
      req.user,
      async (transaction) => {
        await product.update({ quantity: newQty }, { transaction });

        const log = await StockLog.create(
          {
            id: uuidv4(),
            tenantId: req.tenantId,
            productId: product.id,
            changeType: changeType.toUpperCase(),
            quantityChanged: actualDelta,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: reason || `Manual stock update (${changeType})`,
            performedBy: req.user?.name || "Inventory Manager",
          },
          { transaction }
        );

        const isLowStock = newQty <= product.reorderPoint;

        await publishEvent("inventory.product.updated", {
          tenantId: req.tenantId,
          productId: product.id,
          sku: product.sku,
          oldQuantity: prevQty,
          newQuantity: newQty,
          reorderPoint: product.reorderPoint,
          isLowStock,
        });

        if (isLowStock) {
          await Notification.create(
            {
              id: uuidv4(),
              tenantId: req.tenantId,
              type: "LOW_STOCK",
              title: `Low Stock Alert: ${product.name}`,
              message: `SKU ${product.sku} has fallen to ${newQty} units (Reorder Threshold: ${product.reorderPoint}).`,
              isRead: false,
              metadata: { productId: product.id, sku: product.sku, quantity: newQty, reorderPoint: product.reorderPoint },
            },
            { transaction }
          );
        }

        return { product, log, isLowStock };
      },
      { actionType: "adjust_stock", tenantId: req.tenantId }
    );

    return httpResponse.SUCCESS(res, result, "Stock adjusted successfully.");
  } catch (error) {
    console.error("adjustStock error:", error);
    newrelicHelper.noticeError(error, { endpoint: "adjustStock", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

export const getStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await StockLog.findAll({
      where: { productId: id, tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    return httpResponse.SUCCESS(res, logs);
  } catch (error) {
    console.error("getStockHistory error:", error);
    newrelicHelper.noticeError(error, { endpoint: "getStockHistory", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!product) {
      return httpResponse.NOT_FOUND(res, {}, "Product not found.");
    }

    await executeWithWriteGate(
      req.user,
      async (transaction) => {
        await product.destroy({ transaction });

        await publishEvent("inventory.product.deleted", {
          tenantId: req.tenantId,
          productId: req.params.id,
        });

        return { deleted: true, id: req.params.id };
      },
      { actionType: "delete_product", tenantId: req.tenantId }
    );

    return httpResponse.SUCCESS(res, {}, "Product deleted successfully.");
  } catch (error) {
    console.error("deleteProduct error:", error);
    newrelicHelper.noticeError(error, { endpoint: "deleteProduct", tenantId: req.tenantId });
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};
