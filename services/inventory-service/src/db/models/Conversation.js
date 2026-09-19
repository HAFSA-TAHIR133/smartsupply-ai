import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Conversation = sequelize.define(
  "Conversation",
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
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(255),
      defaultValue: "New Conversation",
      allowNull: false,
    },
    agentId: {
      type: DataTypes.STRING(50),
      defaultValue: "supply-chain-agent",
      allowNull: false,
    },
  },
  {
    tableName: "conversations",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Conversation;
