'use strict';
const { Sequelize } = require('sequelize');

const name = '20210831193231-create-block.js';

async function up({ context: queryInterface }) {
  await queryInterface.createTable('blocks', {
    hash: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    },
    era: Sequelize.BIGINT,
    timestamp: Sequelize.DATE,
    height: Sequelize.BIGINT,
    era_end: Sequelize.BOOLEAN,
    validated: Sequelize.BOOLEAN,
  });
}

async function down({ context: queryInterface }) {
  await queryInterface.dropTable('blocks');
}

module.exports = { name, up, down };
