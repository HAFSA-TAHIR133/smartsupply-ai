import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const AgentMemory = sequelize.define(
  "AgentMemory",
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
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: "GENERAL",
      allowNull: false,
    },
    isLongTerm: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "agent_memories",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default AgentMemory;
