'use strict';

const name = '20220111203853-from_index.js';

async function up({ context: queryInterface }) {
  return queryInterface.sequelize.query('create extension if not exists pg_trgm; CREATE INDEX from_index ON deploys USING gin("from" gin_trgm_ops);');
}

async function down({ context: queryInterface }) {
  return queryInterface.sequelize.query('DROP INDEX from_index;');
}

module.exports = { name, up, down };
