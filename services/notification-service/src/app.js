import "dotenv/config";
import express from "express";
import { startNotificationConsumer } from "./consumers/eventConsumer.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672/";

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "notification-service" });
});

app.listen(PORT, async () => {
  console.log(`🚀 Notification Service running on port ${PORT}`);
  await startNotificationConsumer(RABBITMQ_URL).catch((err) => {
    console.error("RabbitMQ connection deferred/failed on boot:", err.message);
  });
});

export default app;