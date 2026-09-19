export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("products", "imageUrl", {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn("products", "imagePublicId", {
    type: Sequelize.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("products", "imageUrl");
  await queryInterface.removeColumn("products", "imagePublicId");
}