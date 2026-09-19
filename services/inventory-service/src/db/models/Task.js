import { DataTypes } from "sequelize";
import { sequelize } from "../index.js";

const Task = sequelize.define(
  "Task",
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "TODO", // TODO, IN_PROGRESS, DONE
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING(20),
      defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    relatedToType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    relatedToId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "tasks",
    timestamps: true,
    indexes: [{ fields: ["tenantId"] }, { fields: ["status"] }],
  }
);

export default Task;
