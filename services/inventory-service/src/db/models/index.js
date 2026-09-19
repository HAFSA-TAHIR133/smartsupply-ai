import Tenant from "./Tenants.js";
import Product from "./Product.js";
import User from "./User.js";
import StockLog from "./StockLog.js";
import Lead from "./Lead.js";
import Customer from "./Customer.js";
import Contact from "./Contact.js";
import Pipeline from "./Pipeline.js";
import PipelineStage from "./PipelineStage.js";
import Task from "./Task.js";
import Activity from "./Activity.js";
import Conversation from "./Conversation.js";
import Message from "./Message.js";
import Agent from "./Agent.js";
import AgentExecution from "./AgentExecution.js";
import AgentMemory from "./AgentMemory.js";
import Notification from "./Notification.js";
import PasswordResetToken from "./PasswordResetToken.js";
import PendingAction from "./PendingAction.js";
import Chart from "./Chart.js";

// Tenant Associations
Tenant.hasMany(Product, { foreignKey: "tenantId", as: "products", onDelete: "CASCADE" });
Product.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(User, { foreignKey: "tenantId", as: "users", onDelete: "CASCADE" });
User.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(StockLog, { foreignKey: "tenantId", as: "stockLogs", onDelete: "CASCADE" });
StockLog.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });
Product.hasMany(StockLog, { foreignKey: "productId", as: "stockLogs", onDelete: "CASCADE" });
StockLog.belongsTo(Product, { foreignKey: "productId", as: "product" });

Tenant.hasMany(Lead, { foreignKey: "tenantId", as: "leads", onDelete: "CASCADE" });
Lead.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(Customer, { foreignKey: "tenantId", as: "customers", onDelete: "CASCADE" });
Customer.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Customer.hasMany(Contact, { foreignKey: "customerId", as: "contacts", onDelete: "CASCADE" });
Contact.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

Tenant.hasMany(Pipeline, { foreignKey: "tenantId", as: "pipelines", onDelete: "CASCADE" });
Pipeline.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Pipeline.hasMany(PipelineStage, { foreignKey: "pipelineId", as: "stages", onDelete: "CASCADE" });
PipelineStage.belongsTo(Pipeline, { foreignKey: "pipelineId", as: "pipeline" });

Tenant.hasMany(Task, { foreignKey: "tenantId", as: "tasks", onDelete: "CASCADE" });
Task.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(Activity, { foreignKey: "tenantId", as: "activities", onDelete: "CASCADE" });
Activity.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(Conversation, { foreignKey: "tenantId", as: "conversations", onDelete: "CASCADE" });
Conversation.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });
User.hasMany(Conversation, { foreignKey: "userId", as: "conversations", onDelete: "SET NULL" });
Conversation.belongsTo(User, { foreignKey: "userId", as: "user" });

Conversation.hasMany(Message, { foreignKey: "conversationId", as: "messages", onDelete: "CASCADE" });
Message.belongsTo(Conversation, { foreignKey: "conversationId", as: "conversation" });

Tenant.hasMany(Agent, { foreignKey: "tenantId", as: "agents", onDelete: "CASCADE" });
Agent.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(AgentExecution, { foreignKey: "tenantId", as: "agentExecutions", onDelete: "CASCADE" });
AgentExecution.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(AgentMemory, { foreignKey: "tenantId", as: "agentMemories", onDelete: "CASCADE" });
AgentMemory.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(Notification, { foreignKey: "tenantId", as: "notifications", onDelete: "CASCADE" });
Notification.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });

Tenant.hasMany(Chart, { foreignKey: "tenantId", as: "charts", onDelete: "CASCADE" });
Chart.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });
User.hasMany(Chart, { foreignKey: "userId", as: "charts", onDelete: "CASCADE" });
Chart.belongsTo(User, { foreignKey: "userId", as: "user" });

Tenant.hasMany(PendingAction, { foreignKey: "tenantId", as: "pendingActions", onDelete: "CASCADE" });
PendingAction.belongsTo(Tenant, { foreignKey: "tenantId", as: "tenant" });
User.hasMany(PendingAction, { foreignKey: "userId", as: "pendingActions", onDelete: "CASCADE" });
PendingAction.belongsTo(User, { foreignKey: "userId", as: "user" });

export {
  Tenant,
  Product,
  User,
  StockLog,
  Lead,
  Customer,
  Contact,
  Pipeline,
  PipelineStage,
  Task,
  Activity,
  Conversation,
  Message,
  Agent,
  AgentExecution,
  AgentMemory,
  Notification,
  PasswordResetToken,
  PendingAction,
  Chart,
};