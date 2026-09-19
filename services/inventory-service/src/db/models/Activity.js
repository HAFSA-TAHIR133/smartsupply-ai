import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Activity = sequelize.define(
  "Activity",
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
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "activities",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Activity;
