import "./preload.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { sequelize } from "./db/index.js";
import "./db/models/index.js";
import { initRabbitMQ } from "./events/publisher.js";
import { startConsumer } from "./events/consumer.js";
import { initAgentQueue } from "./services/agentQueueService.js";

// V1 Modular Routes
import authRoutes from "./routes/authRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import crmRoutes from "./routes/crmRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import chartRoutes from "./routes/chartRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";

const app = express();
const PORT = process.env.PORT || 4001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(morgan("dev"));

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "smartsupply-backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// V1 API Endpoints
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/crm", crmRoutes);
app.use("/api/v1/agents", agentRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/charts", chartRoutes);
app.use("/api/v1/monitoring", monitoringRoutes);

// Backward Compatibility & Task 3 Direct Paths
app.use("/api/charts", chartRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/products", productRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route '${req.method} ${req.originalUrl}' not found.`,
    },
  });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully (PostgreSQL)");

    app.listen(PORT, () => {
      console.log(`🚀 SmartSupply AI Backend running on http://localhost:${PORT}`);
    });

    // Initialize Event Buses asynchronously without blocking server boot
    initRabbitMQ().catch(err => console.warn("RabbitMQ publisher deferred:", err.message));
    initAgentQueue().catch(err => console.warn("RabbitMQ agent queue deferred:", err.message));
    startConsumer().catch(err => console.warn("RabbitMQ consumer deferred:", err.message));

  } catch (error) {
    console.error("❌ Unable to start backend service:", error.message);
    process.exit(1);
  }
}

start();

export default app;