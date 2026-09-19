export async function up(queryInterface, Sequelize) {
  // Tenants table
  await queryInterface.createTable("tenants", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    slug: {
      type: Sequelize.STRING(50),
      allowNull: false,
      unique: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    isDemo: {
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

  // Products table
  await queryInterface.createTable("products", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tenantId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "tenants",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    sku: {
      type: Sequelize.STRING(50),
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(150),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    reorderPoint: {
      type: Sequelize.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    unitPrice: {
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

  // Indexes
  await queryInterface.addIndex("products", ["tenantId"]);
  await queryInterface.addIndex("products", ["tenantId", "sku"], {
    unique: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable("products");
  await queryInterface.dropTable("tenants");
}