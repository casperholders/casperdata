'use strict';

const view_name = 'full_stats';
const query = 'SELECT count(*), type, date_trunc(\'day\', timestamp) as day from deploys WHERE timestamp >= NOW() - INTERVAL \'14 DAY\' GROUP BY day, type;';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`CREATE VIEW ${view_name} AS ${query}`);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`DROP VIEW ${view_name}`);
  }
};
