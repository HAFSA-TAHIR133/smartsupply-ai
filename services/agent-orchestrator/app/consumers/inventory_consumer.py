import json
import pika
import logging
from app.config import settings
from app.graphs.reorder_workflow import build_reorder_graph

logger = logging.getLogger(__name__)

def process_inventory_event(ch, method, properties, body):
    try:
        event = json.loads(body)
        logger.info(f"📩 [Event Received] Routing Key: {method.routing_key}")

        if event.get("isLowStock"):
            tenant_id = str(event.get("tenantId"))
            product_id = str(event.get("productId"))
            sku = event.get("sku", "UNKNOWN-SKU")
            new_quantity = event.get("newQuantity", 0)
            reorder_point = event.get("reorderPoint", 10)
            unit_price = float(event.get("price", 45.0))

            logger.info(f"⚡ Triggering Reorder Graph for Tenant: {tenant_id}, SKU: {sku}")

            workflow = build_reorder_graph()
            initial_state = {
                "tenant_id": tenant_id,
                "product_id": product_id,
                "sku": sku,
                "current_quantity": new_quantity,
                "reorder_point": reorder_point,
                "unit_price": unit_price,
                "recommended_quantity": 0,
                "context_memories": [],
                "vendor_preference": None,
                "ai_reasoning": None,
                "needs_hitl_approval": False,
                "hitl_request_id": None,
                "status": "INIT"
            }

            result = workflow.invoke(initial_state)
            logger.info(f"✅ Workflow Execution Completed for Tenant {tenant_id}. Status: {result['status']}")

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        logger.error(f"❌ Error processing message: {str(e)}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_consumer():
    while True:
        try:
            if not settings.RABBITMQ_URL:
                logger.warning("⚠️ RABBITMQ_URL not configured. Consumer loop dormant.")
                break

            connection_params = pika.URLParameters(settings.RABBITMQ_URL)
            connection = pika.BlockingConnection(connection_params)
            channel = connection.channel()

            # Main topic exchange
            channel.exchange_declare(exchange="shop.events", exchange_type="topic", durable=True)
            # Legacy exchange for backward compatibility
            channel.exchange_declare(exchange="inventory_events", exchange_type="topic", durable=True)

            queue_name = "agent_inventory_queue"
            channel.queue_declare(queue=queue_name, durable=True)
            channel.queue_bind(exchange="shop.events", queue=queue_name, routing_key="stock.low")
            channel.queue_bind(exchange="shop.events", queue=queue_name, routing_key="inventory.#")
            channel.queue_bind(exchange="inventory_events", queue=queue_name, routing_key="inventory.product.updated")

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue_name, on_message_callback=process_inventory_event)

            logger.info("📡 [Agent Orchestrator Consumer] Listening on shop.events (stock.low, inventory.#)...")
            channel.start_consuming()
        except Exception as e:
            logger.error(f"❌ RabbitMQ Consumer disconnected or failed to start: {str(e)}. Retrying in 5 seconds...")
            import time
            time.sleep(5)