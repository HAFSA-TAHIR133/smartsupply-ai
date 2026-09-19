import { v4 as uuidv4 } from "uuid";
import { Chart } from "../db/models/index.js";
import { executeWithWriteGate } from "../utils/writeGate.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";
import { newrelicHelper } from "../utils/newrelicHelper.js";
import { publishShopEvent } from "../events/publisher.js";

/**
 * GET /api/charts
 * Lists saved charts scoped to the authenticated user and tenant.
 */
export const getCharts = async (req, res) => {
  try {
    const charts = await Chart.findAll({
      where: {
        tenantId: req.tenantId,
        userId: req.user.id,
      },
      order: [["createdAt", "DESC"]],
    });

    return httpResponse.SUCCESS(res, charts);
  } catch (error) {
    console.error("getCharts error:", error);
    newrelicHelper.noticeError(error, { endpoint: "getCharts", userId: req.user?.id });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

/**
 * POST /api/charts
 * Creates a new chart from configuration (passes through write gate).
 */
export const createChart = async (req, res) => {
  try {
    const { title, type, config, thumbnail } = req.body;

    if (!title || !title.trim()) {
      return httpResponse.BAD_REQUEST(res, {}, "Chart title is required.");
    }

    const validTypes = ["bar", "line", "area", "pie"];
    const chartType = (type || "bar").toLowerCase();
    if (!validTypes.includes(chartType)) {
      return httpResponse.BAD_REQUEST(
        res,
        {},
        `Invalid chart type '${type}'. Must be one of: ${validTypes.join(", ")}`
      );
    }

    const chartConfig = config && typeof config === "object" ? config : {
      dataSource: "custom",
      data: [
        { name: "Group A", value: 40 },
        { name: "Group B", value: 30 },
        { name: "Group C", value: 20 },
      ],
    };

    const newChart = await executeWithWriteGate(
      req.user,
      async (transaction) => {
        const chart = await Chart.create(
          {
            id: uuidv4(),
            tenantId: req.tenantId,
            userId: req.user.id,
            title: title.trim(),
            type: chartType,
            config: chartConfig,
            thumbnail: thumbnail || null,
          },
          { transaction }
        );

        await publishShopEvent("chart.created", {
          idempotencyKey: chart.id,
          userId: req.user.id,
          tenantId: req.tenantId,
          chartId: chart.id,
          title: chart.title,
        });

        return chart;
      },
      { actionType: "create_chart", tenantId: req.tenantId }
    );

    return httpResponse.CREATED(res, newChart, "Chart created successfully.");
  } catch (error) {
    console.error("createChart error:", error);
    newrelicHelper.noticeError(error, { endpoint: "createChart", userId: req.user?.id });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};

/**
 * DELETE /api/charts/:id
 * Deletes a chart only if chart.userId === req.user.id (403 otherwise).
 */
export const deleteChart = async (req, res) => {
  try {
    const { id } = req.params;

    const chart = await Chart.findOne({
      where: {
        id,
        tenantId: req.tenantId,
      },
    });

    if (!chart) {
      return httpResponse.NOT_FOUND(res, {}, "Chart not found.");
    }

    // Strict multi-tenant / user ownership check
    if (chart.userId !== req.user.id) {
      return httpResponse.FORBIDDEN(
        res,
        {},
        "You do not have permission to delete this chart."
      );
    }

    await executeWithWriteGate(
      req.user,
      async (transaction) => {
        await chart.destroy({ transaction });
        return { deleted: true, id };
      },
      { actionType: "delete_chart", tenantId: req.tenantId }
    );

    return httpResponse.SUCCESS(res, { id }, "Chart deleted successfully.");
  } catch (error) {
    console.error("deleteChart error:", error);
    newrelicHelper.noticeError(error, { endpoint: "deleteChart", chartId: req.params.id });
    return httpResponse.INTERNAL_SERVER_ERROR(res, {}, error.message);
  }
};
