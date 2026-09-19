import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Lead = sequelize.define(
  "Lead",
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
    company: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "NEW", // NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "leads",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }],
  }
);

export default Lead;
