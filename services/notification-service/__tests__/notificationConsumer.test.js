import { jest } from "@jest/globals";
import { NotificationService } from "../src/services/notificationService.js";

describe("Notification Service Unit Tests", () => {
  test("Should trigger low stock notification correctly", async () => {
    const spy = jest.spyOn(NotificationService, "sendLowStockAlert");
    
    const mockEvent = {
      tenantId: "3e6c5a8e-f131-4902-8d80-1c9056f858d4",
      sku: "TEST-SKU-1",
      newQuantity: 2,
      reorderPoint: 10
    };

    const result = await NotificationService.sendLowStockAlert(mockEvent);

    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledWith(mockEvent);
  });
});