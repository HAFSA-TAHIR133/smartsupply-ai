import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Contact = sequelize.define(
  "Contact",
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
    customerId: {
      type: DataTypes.UUID,
      allowNull: true,
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
    role: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "contacts",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }, { fields: ["customerId"] }],
  }
);

export default Contact;
