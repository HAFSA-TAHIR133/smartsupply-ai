import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Customer = sequelize.define(
  "Customer",
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
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    company: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "ACTIVE",
      allowNull: false,
    },
    totalSpend: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "customers",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Customer;
