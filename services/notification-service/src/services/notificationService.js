import { logger } from "../utils/logger.js";

export class NotificationService {
  static async sendLowStockAlert(event) {
    logger.info(`🚨 [NOTIFICATION] Low stock alert sent for Tenant: ${event.tenantId}`, {
      sku: event.sku,
      currentQuantity: event.newQuantity,
      reorderPoint: event.reorderPoint
    });
    return true;
  }

  static async sendHITLApprovalRequest(event) {
    logger.info(`📩 [NOTIFICATION] Reorder approval needed for Tenant: ${event.tenant_id}`, {
      sku: event.sku,
      recommendedQty: event.recommended_quantity,
      requestId: event.hitl_request_id
    });
    return true;
  }
}