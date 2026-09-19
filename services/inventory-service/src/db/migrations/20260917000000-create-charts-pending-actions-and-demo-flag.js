export async function up(queryInterface, Sequelize) {
  // 1. Add isDemo to users table
  const userTable = await queryInterface.describeTable("users");
  if (!userTable.isDemo) {
    await queryInterface.addColumn("users", "isDemo", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  }

  // 2. Add isDemo to tenants table
  const tenantTable = await queryInterface.describeTable("tenants");
  if (!tenantTable.isDemo) {
    await queryInterface.addColumn("tenants", "isDemo", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    });
  }

  // 3. Create charts table
  const tables = await queryInterface.showAllTables();
  if (!tables.includes("charts")) {
    await queryInterface.createTable("charts", {
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
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      thumbnail: {
        type: Sequelize.STRING(500),
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

    await queryInterface.addIndex("charts", ["tenantId"]);
    await queryInterface.addIndex("charts", ["userId"]);
    await queryInterface.addIndex("charts", ["createdAt"]);
  }

  // 4. Create pending_actions table
  if (!tables.includes("pending_actions")) {
    await queryInterface.createTable("pending_actions", {
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
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      actionType: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      targetEntity: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      params: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      summary: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        defaultValue: "PENDING",
        allowNull: false,
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      executedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      executionResult: {
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

    await queryInterface.addIndex("pending_actions", ["tenantId"]);
    await queryInterface.addIndex("pending_actions", ["userId"]);
    await queryInterface.addIndex("pending_actions", ["status"]);
    await queryInterface.addIndex("pending_actions", ["expiresAt"]);
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable("pending_actions");
  await queryInterface.dropTable("charts");
  await queryInterface.removeColumn("users", "isDemo");
  await queryInterface.removeColumn("tenants", "isDemo");
}
