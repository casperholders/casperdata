const { Sequelize } = require('sequelize');

const name = '20210831203931-create-deploy.js';

async function up({ context: queryInterface }) {
  await queryInterface.createTable('deploys', {
    hash: {
      allowNull: false,
      primaryKey: true,
      type: Sequelize.STRING,
    },
    from: {
      type: Sequelize.STRING,
    },
    cost: {
      type: Sequelize.STRING,
    },
    result: {
      type: Sequelize.BOOLEAN,
    },
    timestamp: {
      type: Sequelize.DATE,
    },
    block: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: 'blocks',
        key: 'hash',
      },
    },
    type: {
      type: Sequelize.STRING,
    },
    data: {
      type: Sequelize.JSONB,
    },
  });
}

async function down({ context: queryInterface }) {
  await queryInterface.dropTable('deploys');
}

module.exports = { name, up, down };
