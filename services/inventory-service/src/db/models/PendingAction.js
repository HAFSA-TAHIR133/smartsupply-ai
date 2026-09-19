import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const PendingAction = sequelize.define(
  "PendingAction",
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actionType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    targetEntity: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    params: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    summary: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "EXPIRED"),
      defaultValue: "PENDING",
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    executionResult: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "pending_actions",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { fields: ["userId"] },
      { fields: ["status"] },
      { fields: ["expiresAt"] },
    ],
  }
);

export default PendingAction;
