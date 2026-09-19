import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Pipeline = sequelize.define(
  "Pipeline",
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  },
  {
    tableName: "pipelines",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Pipeline;
