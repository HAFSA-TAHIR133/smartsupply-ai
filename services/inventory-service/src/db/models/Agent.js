import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Agent = sequelize.define(
  "Agent",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    allowedTools: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    systemPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "agents",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Agent;
