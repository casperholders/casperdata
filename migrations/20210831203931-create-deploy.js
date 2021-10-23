'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('deploys', {
      hash: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING
      },
      from: {
        type: Sequelize.STRING
      },
      cost: {
        type: Sequelize.STRING
      },
      result: {
        type: Sequelize.BOOLEAN
      },
      timestamp: {
        type: Sequelize.DATE
      },
      block: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'blocks',
          key: 'hash'
        }
      },
      type: {
        type: Sequelize.STRING
      },
      data: {
        type: Sequelize.JSONB
      },
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('deploys');
  }
};
