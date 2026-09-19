import { initRabbitMQManager, publishShopEvent } from "./rabbitMQManager.js";

export const initRabbitMQ = async () => {
  return await initRabbitMQManager();
};

export const publishEvent = async (routingKey, message) => {
  return await publishShopEvent(routingKey, message);
};

export { publishShopEvent };