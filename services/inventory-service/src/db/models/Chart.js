import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Chart = sequelize.define(
  "Chart",
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
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false, // 'bar', 'line', 'area', 'pie'
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false, // { dataSource, xAxis, yAxis, data, metrics }
    },
    thumbnail: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "charts",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { fields: ["userId"] },
      { fields: ["createdAt"] },
    ],
  }
);

export default Chart;
