import amqp from "amqplib";
import { NotificationService } from "../services/notificationService.js";
import { logger } from "../utils/logger.js";

export async function startNotificationConsumer(rabbitUrl) {
  try {
    const connection = await amqp.connect(rabbitUrl);
    const channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange("inventory_events", "topic", { durable: true });

    // Declare and bind consumer queue
    const queueName = "notification_service_queue";
    await channel.assertQueue(queueName, { durable: true });

    // Listen to inventory events
    await channel.bindQueue(queueName, "inventory_events", "inventory.product.updated");

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        
        if (payload.isLowStock) {
          await NotificationService.sendLowStockAlert(payload);
        }

        channel.ack(msg);
      } catch (err) {
        logger.error("Failed to process message in notification-service", { error: err.message });
        channel.nack(msg, false, false);
      }
    });

    logger.info("📡 [Notification Service] Connected and listening for events...");
    return { connection, channel };
  } catch (error) {
    logger.error("Error connecting Notification Service to RabbitMQ", { error: error.message });
    throw error;
  }
}