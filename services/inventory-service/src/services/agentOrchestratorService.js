import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import { PendingAction, Product, StockLog, Chart, Notification } from "../db/models/index.js";
import { executeWithWriteGate } from "../utils/writeGate.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";
import { publishShopEvent } from "../events/publisher.js";

const PENDING_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes timeout

/**
 * Classifies intent and extracts structured action.
 */
export async function analyzeAgentIntent({ message, tenantId, userId }) {
  const text = (message || "").toLowerCase().trim();

  // 1. Check for mutating / write actions
  const isRestock = /(restock|re-stock|add stock|increase stock|replenish)/i.test(text);
  const isAdjustOut = /(reduce stock|decrease stock|deduct stock|remove stock|consume)/i.test(text);
  const isDeleteProduct = /(delete product|remove product|delete item|remove item)/i.test(text);
  const isCreateChart = /(create chart|generate chart|build chart|new chart|add chart)/i.test(text);
  const isDeleteChart = /(delete chart|remove chart)/i.test(text);

  // Parse restock / stock adjustment
  if (isRestock || isAdjustOut) {
    // Extract quantity (e.g. 50, "by 50 units", "100 pcs")
    const qtyMatch = text.match(/(\d+)\s*(units?|pcs?|pieces?|items?)?/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 25;
    const changeType = isAdjustOut ? "OUT" : "IN";

    // Attempt to match product in tenant's inventory
    const products = await Product.findAll({ where: { tenantId }, limit: 50 });
    let matchedProduct = null;

    for (const prod of products) {
      if (
        text.includes(prod.name.toLowerCase()) ||
        text.includes(prod.sku.toLowerCase())
      ) {
        matchedProduct = prod;
        break;
      }
    }

    if (!matchedProduct && products.length > 0) {
      // If no exact match, fallback to first product or keyword match
      matchedProduct = products[0];
    }

    if (matchedProduct) {
      const summary = `${changeType === "IN" ? "Restock" : "Deduct"} '${matchedProduct.name}' (${matchedProduct.sku}) by ${quantity} units`;
      return {
        isWrite: true,
        actionType: "restock_item",
        targetEntity: {
          id: matchedProduct.id,
          name: matchedProduct.name,
          sku: matchedProduct.sku,
          currentQuantity: matchedProduct.quantity,
          unitPrice: matchedProduct.unitPrice,
        },
        params: {
          quantity,
          changeType,
          reason: `Agent proposed ${changeType === "IN" ? "restock" : "stock adjustment"} via conversation`,
        },
        summary,
      };
    }
  }

  // Parse delete product
  if (isDeleteProduct) {
    const products = await Product.findAll({ where: { tenantId }, limit: 50 });
    let matchedProduct = null;

    for (const prod of products) {
      if (text.includes(prod.name.toLowerCase()) || text.includes(prod.sku.toLowerCase())) {
        matchedProduct = prod;
        break;
      }
    }

    if (matchedProduct) {
      return {
        isWrite: true,
        actionType: "delete_product",
        targetEntity: {
          id: matchedProduct.id,
          name: matchedProduct.name,
          sku: matchedProduct.sku,
        },
        params: { id: matchedProduct.id },
        summary: `Permanently delete product '${matchedProduct.name}' (${matchedProduct.sku})`,
      };
    }
  }

  // Parse create chart
  if (isCreateChart) {
    let type = "bar";
    if (/line/i.test(text)) type = "line";
    else if (/area/i.test(text)) type = "area";
    else if (/pie/i.test(text)) type = "pie";

    let title = "Inventory Stock by Category";
    if (/lead|crm|pipeline|stage/i.test(text)) {
      title = "CRM Leads by Stage";
    } else if (/trend|history|stock value/i.test(text)) {
      title = "Inventory Valuation Trend";
    }

    return {
      isWrite: true,
      actionType: "create_chart",
      targetEntity: { title, type },
      params: {
        title,
        type,
        config: {
          dataSource: title.includes("CRM") ? "crm_leads" : "inventory_products",
          xAxis: "name",
          yAxis: "value",
          data: [
            { name: "Electronics", value: 120 },
            { name: "Accessories", value: 85 },
            { name: "Hardware", value: 45 },
            { name: "Office", value: 30 },
          ],
        },
      },
      summary: `Create a new ${type.toUpperCase()} chart: "${title}"`,
    };
  }

  // Parse delete chart
  if (isDeleteChart) {
    const chart = await Chart.findOne({ where: { tenantId, userId } });
    if (chart) {
      return {
        isWrite: true,
        actionType: "delete_chart",
        targetEntity: { id: chart.id, title: chart.title },
        params: { id: chart.id },
        summary: `Delete saved chart "${chart.title}"`,
      };
    }
  }

  // 2. Read-only actions (execute immediately without confirmation)
  const isLowStockQuery = /(low stock|low-stock|out of stock|reorder alerts?)/i.test(text);
  const isListInventory = /(show inventory|list items|view stock|all products|product list)/i.test(text);
  const isShowCharts = /(show charts|my charts|list charts|view charts)/i.test(text);

  if (isLowStockQuery) {
    const lowStockItems = await Product.findAll({
      where: {
        tenantId,
        [Op.and]: [
          { quantity: { [Op.gt]: 0 } },
          Product.sequelize.literal(`"quantity" <= "reorderPoint"`),
        ],
      },
      limit: 10,
    });

    const itemsSummary = lowStockItems.length > 0
      ? lowStockItems.map((p) => `• **${p.name}** (${p.sku}): **${p.quantity}** in stock (Reorder Point: ${p.reorderPoint})`).join("\n")
      : "All items are currently above their safety reorder thresholds.";

    return {
      isWrite: false,
      actionType: "show_low_stock",
      answer: `Here are your current low-stock items:\n\n${itemsSummary}\n\nWould you like me to prepare a restock action for any of these?`,
      data: lowStockItems,
    };
  }

  if (isListInventory) {
    const items = await Product.findAll({ where: { tenantId }, limit: 5 });
    const itemsSummary = items
      .map((p) => `• **${p.name}** (${p.sku}) — Stock: ${p.quantity} | Price: $${p.unitPrice}`)
      .join("\n");

    return {
      isWrite: false,
      actionType: "list_inventory",
      answer: `Here is a preview of your inventory items:\n\n${itemsSummary}`,
      data: items,
    };
  }

  if (isShowCharts) {
    const charts = await Chart.findAll({ where: { tenantId, userId }, limit: 5 });
    const chartSummary = charts.length > 0
      ? charts.map((c) => `• **${c.title}** (${c.type.toUpperCase()})`).join("\n")
      : "You do not have any saved charts yet. You can ask me to create one (e.g. 'Create a bar chart for inventory by category').";

    return {
      isWrite: false,
      actionType: "view_charts",
      answer: `Here are your saved charts:\n\n${chartSummary}`,
      data: charts,
    };
  }

  // General conversational query
  return {
    isWrite: false,
    actionType: "general_query",
    answer: null, // Will fall back to LLM / Agent Queue
  };
}

/**
 * Creates a pending action that requires human confirmation.
 */
export async function createPendingAction({ tenantId, userId, actionType, targetEntity, params, summary }) {
  const expiresAt = new Date(Date.now() + PENDING_TIMEOUT_MS);

  const pendingAction = await PendingAction.create({
    id: uuidv4(),
    tenantId,
    userId,
    actionType,
    targetEntity,
    params,
    summary,
    status: "PENDING",
    expiresAt,
  });

  newrelicHelper.recordAgentTaskEvent({
    actionType,
    status: "PROPOSED",
    userId,
    tenantId,
    success: true,
  });

  return pendingAction;
}

/**
 * Executes an approved pending action through the unified write gate.
 */
export async function executePendingAction(pendingAction, reqUser) {
  const { actionType, targetEntity, params, tenantId, userId } = pendingAction;

  return await executeWithWriteGate(
    reqUser,
    async (transaction) => {
      let executionResult = null;

      if (actionType === "restock_item") {
        const product = await Product.findOne({
          where: { id: targetEntity.id, tenantId },
          transaction,
        });

        if (!product) {
          throw new Error(`Target product '${targetEntity.name}' not found.`);
        }

        const prevQty = product.quantity;
        const delta = parseInt(params.quantity, 10);
        const newQty = params.changeType === "OUT" ? Math.max(0, prevQty - delta) : prevQty + delta;
        const actualDelta = newQty - prevQty;

        await product.update({ quantity: newQty }, { transaction });

        const log = await StockLog.create(
          {
            id: uuidv4(),
            tenantId,
            productId: product.id,
            changeType: params.changeType || "IN",
            quantityChanged: actualDelta,
            previousQuantity: prevQty,
            newQuantity: newQty,
            reason: params.reason || "Agent Human-in-the-Loop confirmed action",
            performedBy: reqUser.name || "AI Agent (Approved)",
          },
          { transaction }
        );

        // Publish event
        await publishShopEvent("agent.action.approved", {
          idempotencyKey: pendingAction.id,
          userId,
          tenantId,
          actionType,
          productId: product.id,
          sku: product.sku,
          newQuantity: newQty,
          timestamp: new Date().toISOString(),
        });

        executionResult = {
          success: true,
          actionType,
          product: { id: product.id, name: product.name, sku: product.sku, newQuantity: newQty },
          logId: log.id,
          message: `✅ Confirmed & executed: Stock for '${product.name}' was updated to ${newQty} units.`,
        };
      } else if (actionType === "delete_product") {
        const product = await Product.findOne({
          where: { id: targetEntity.id, tenantId },
          transaction,
        });

        if (product) {
          await product.destroy({ transaction });
        }

        await publishShopEvent("agent.action.approved", {
          idempotencyKey: pendingAction.id,
          userId,
          tenantId,
          actionType,
          productId: targetEntity.id,
        });

        executionResult = {
          success: true,
          actionType,
          message: `✅ Confirmed & executed: Product '${targetEntity.name}' was deleted.`,
        };
      } else if (actionType === "create_chart") {
        const chart = await Chart.create(
          {
            id: uuidv4(),
            tenantId,
            userId,
            title: params.title,
            type: params.type,
            config: params.config,
          },
          { transaction }
        );

        await publishShopEvent("chart.created", {
          idempotencyKey: pendingAction.id,
          userId,
          tenantId,
          chartId: chart.id,
          title: chart.title,
        });

        executionResult = {
          success: true,
          actionType,
          chart,
          message: `✅ Confirmed & executed: Created new chart '${chart.title}'. It is now visible on your Charts dashboard.`,
        };
      } else if (actionType === "delete_chart") {
        const chart = await Chart.findOne({
          where: { id: targetEntity.id, tenantId, userId },
          transaction,
        });

        if (chart) {
          await chart.destroy({ transaction });
        }

        executionResult = {
          success: true,
          actionType,
          message: `✅ Confirmed & executed: Chart '${targetEntity.title}' has been deleted.`,
        };
      } else {
        throw new Error(`Unsupported action type: ${actionType}`);
      }

      return executionResult;
    },
    { actionType, tenantId }
  );
}
