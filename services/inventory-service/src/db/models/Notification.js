import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false, // LOW_STOCK, AGENT_ACTION, SYSTEM, CRM
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }, { fields: ["isRead"] }],
  }
);

export default Notification;
