'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('blocks', {
      hash: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      era: {
        type: Sequelize.BIGINT
      },
      timestamp: {
        type: Sequelize.DATE
      },
      height: {
        type: Sequelize.BIGINT
      },
      era_end: {
        type: Sequelize.BOOLEAN
      },
      validated: {
        type: Sequelize.BOOLEAN
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('blocks');
  }
};