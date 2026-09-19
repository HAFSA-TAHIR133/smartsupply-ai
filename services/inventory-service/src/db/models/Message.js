import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Message = sequelize.define(
  "Message",
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
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender: {
      type: DataTypes.STRING(20),
      allowNull: false, // USER or AGENT
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sources: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "messages",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { fields: ["conversationId"] },
    ],
  }
);

export default Message;
