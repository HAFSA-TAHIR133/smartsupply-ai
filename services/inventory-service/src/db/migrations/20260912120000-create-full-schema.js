export async function up(queryInterface, Sequelize) {
  // 1. Add category and supplierEmail to products if not exists
  const productTable = await queryInterface.describeTable("products");
  if (!productTable.category) {
    await queryInterface.addColumn("products", "category", {
      type: Sequelize.STRING(100),
      defaultValue: "General",
      allowNull: true,
    });
  }
  if (!productTable.supplierEmail) {
    await queryInterface.addColumn("products", "supplierEmail", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
  }

  // 2. Users Table
  await queryInterface.createTable("users", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    passwordHash: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    role: {
      type: Sequelize.STRING(20),
      defaultValue: "ADMIN",
      allowNull: false,
    },
    avatarUrl: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    googleId: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("users", ["tenantId"]);
  await queryInterface.addIndex("users", ["email"], { unique: true });

  // 3. Stock Logs Table
  await queryInterface.createTable("stock_logs", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    productId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "products", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    changeType: {
      type: Sequelize.STRING(20),
      allowNull: false,
    },
    quantityChanged: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    previousQuantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    newQuantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    reason: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    performedBy: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("stock_logs", ["tenantId"]);
  await queryInterface.addIndex("stock_logs", ["productId"]);

  // 4. Leads Table
  await queryInterface.createTable("leads", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    company: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      defaultValue: "NEW",
      allowNull: false,
    },
    value: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    source: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    assignedTo: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("leads", ["tenantId"]);

  // 5. Customers Table
  await queryInterface.createTable("customers", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    company: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      defaultValue: "ACTIVE",
      allowNull: false,
    },
    totalSpend: {
      type: Sequelize.DECIMAL(12, 2),
      defaultValue: 0,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("customers", ["tenantId"]);

  // 6. Contacts Table
  await queryInterface.createTable("contacts", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    customerId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "customers", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: true,
    },
    phone: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    role: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 7. Pipelines & Stages
  await queryInterface.createTable("pipelines", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  await queryInterface.createTable("pipeline_stages", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    pipelineId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "pipelines", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    order: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 8. Tasks Table
  await queryInterface.createTable("tasks", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      defaultValue: "TODO",
      allowNull: false,
    },
    priority: {
      type: Sequelize.STRING(20),
      defaultValue: "MEDIUM",
      allowNull: false,
    },
    dueDate: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    assignedTo: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 9. Activities Table
  await queryInterface.createTable("activities", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    entityType: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    entityId: {
      type: Sequelize.UUID,
      allowNull: true,
    },
    performedBy: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 10. Documents Table
  await queryInterface.createTable("documents", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    fileName: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    filePath: {
      type: Sequelize.STRING(500),
      allowNull: false,
    },
    fileType: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    fileSize: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      defaultValue: "PENDING",
      allowNull: false,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 11. Document Chunks Table
  await queryInterface.createTable("document_chunks", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    documentId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "documents", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    chunkIndex: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    pageNumber: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    embedding: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("document_chunks", ["tenantId"]);
  await queryInterface.addIndex("document_chunks", ["documentId"]);

  // 12. Conversations Table
  await queryInterface.createTable("conversations", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    title: {
      type: Sequelize.STRING(255),
      defaultValue: "New Conversation",
      allowNull: false,
    },
    agentId: {
      type: Sequelize.STRING(50),
      defaultValue: "supply-chain-agent",
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 13. Messages Table
  await queryInterface.createTable("messages", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    conversationId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "conversations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    sender: {
      type: Sequelize.STRING(20),
      allowNull: false, // USER or AGENT
    },
    content: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    sources: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
  await queryInterface.addIndex("messages", ["conversationId"]);

  // 14. Agents Table
  await queryInterface.createTable("agents", {
    id: {
      type: Sequelize.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    role: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    allowedTools: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    systemPrompt: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 15. Agent Executions Table
  await queryInterface.createTable("agent_executions", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    agentId: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    requestId: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    prompt: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    response: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    toolsUsed: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    executionTimeMs: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING(50),
      defaultValue: "SUCCESS",
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 16. Agent Memories Table
  await queryInterface.createTable("agent_memories", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    key: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    value: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    category: {
      type: Sequelize.STRING(50),
      defaultValue: "GENERAL",
      allowNull: false,
    },
    isLongTerm: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 17. Notifications Table
  await queryInterface.createTable("notifications", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "tenants", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    message: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    isRead: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  // 18. Password Reset Tokens Table
  await queryInterface.createTable("password_reset_tokens", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    otpHash: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    used: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("password_reset_tokens");
  await queryInterface.dropTable("notifications");
  await queryInterface.dropTable("agent_memories");
  await queryInterface.dropTable("agent_executions");
  await queryInterface.dropTable("agents");
  await queryInterface.dropTable("messages");
  await queryInterface.dropTable("conversations");
  await queryInterface.dropTable("document_chunks");
  await queryInterface.dropTable("documents");
  await queryInterface.dropTable("activities");
  await queryInterface.dropTable("tasks");
  await queryInterface.dropTable("pipeline_stages");
  await queryInterface.dropTable("pipelines");
  await queryInterface.dropTable("contacts");
  await queryInterface.dropTable("customers");
  await queryInterface.dropTable("leads");
  await queryInterface.dropTable("stock_logs");
  await queryInterface.dropTable("users");
}
