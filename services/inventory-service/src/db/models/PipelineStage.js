import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const PipelineStage = sequelize.define(
  "PipelineStage",
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
    pipelineId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "pipeline_stages",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }, { fields: ["pipelineId"] }],
  }
);

export default PipelineStage;
