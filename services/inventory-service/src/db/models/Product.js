import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Product = sequelize.define(
  "Product",
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
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      defaultValue: "General",
      allowNull: true,
    },
    supplierEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    reorderPoint: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imagePublicId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "products",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { unique: true, fields: ["tenantId", "sku"] },
    ],
  }
);

export default Product;