import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const User = sequelize.define(
  "User",
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
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: "ADMIN",
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDemo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      { fields: ["tenantId"] },
      { unique: true, fields: ["email"] },
    ],
  }
);

export default User;
