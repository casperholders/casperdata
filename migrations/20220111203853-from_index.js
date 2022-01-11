'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('create extension if not exists pg_trgm; CREATE INDEX from_index ON deploys USING gin("from" gin_trgm_ops);');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DROP INDEX from_index;');
  }
};
