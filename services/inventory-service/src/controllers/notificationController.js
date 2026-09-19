import { Notification } from "../db/models/index.js";
import { httpResponse } from "../../../../packages/shared/utils/httpResponse.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { tenantId: req.tenantId },
      order: [["createdAt", "DESC"]],
      limit: 20,
    });
    return httpResponse.SUCCESS(res, notifications);
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, tenantId: req.tenantId },
    });

    if (!notification) return httpResponse.NOT_FOUND(res, {}, "Notification not found.");

    await notification.update({ isRead: true });
    return httpResponse.SUCCESS(res, notification, "Marked as read.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { tenantId: req.tenantId, isRead: false } }
    );
    return httpResponse.SUCCESS(res, {}, "All notifications marked as read.");
  } catch (error) {
    return httpResponse.INTERNAL_SERVER_ERROR(res);
  }
};
