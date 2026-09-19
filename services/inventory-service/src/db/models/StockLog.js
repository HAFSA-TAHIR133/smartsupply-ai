import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const StockLog = sequelize.define(
  "StockLog",
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
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    changeType: {
      type: DataTypes.STRING(20),
      allowNull: false, // IN, OUT, ADJUSTMENT
    },
    quantityChanged: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    previousQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    newQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    performedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "stock_logs",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { fields: ["productId"] },
    ],
  }
);

export default StockLog;
