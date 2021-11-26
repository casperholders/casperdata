'use strict';

const view_name = 'full_stats';
const query = 'SELECT count(*), type, date_trunc(\'day\', timestamp) as day from deploys WHERE timestamp >= NOW() - INTERVAL \'14 DAY\' GROUP BY day, type;';
const { Sequelize } = require('sequelize');


async function up({ context: queryInterface }) {
  return queryInterface.sequelize.query(`CREATE VIEW ${view_name} AS ${query}`);
}

async function down({ context: queryInterface }) {
  return queryInterface.sequelize.query(`DROP VIEW ${view_name}`);
}

module.exports = { up, down };
