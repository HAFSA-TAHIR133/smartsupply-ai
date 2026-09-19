import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const AgentExecution = sequelize.define(
  "AgentExecution",
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
    agentId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    requestId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    response: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    toolsUsed: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    executionTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "SUCCESS",
      allowNull: false,
    },
  },
  {
    tableName: "agent_executions",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { fields: ["agentId"] },
    ],
  }
);

export default AgentExecution;
