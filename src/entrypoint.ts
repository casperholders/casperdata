import Deploys from './services/Deploys';
import DeployParser from './deployParser';
import Blocks from './services/Blocks';
import BlockParser from './blockParser';
import Config from './Config';
import yargs = require('yargs');

const { Umzug, SequelizeStorage } = require('umzug');
const blockMigration = require('../migrations/20210831193231-create-block');
const deployMigration = require('../migrations/20210831203931-create-deploy');
const fullStatsMigration = require('../migrations/20211126003309-full_stats');
const fromIndex = require('../migrations/20220111203853-from_index');
require('dotenv').config();

/**
 * Args available with the software. You can find them when you provide the --help option.
 */
const parser = yargs(process.argv.slice(2)).options({
  rpc: { type: 'string', describe: 'Set the casper node rpc url' },
  limitBulkInsert: {
    type: 'number',
    describe: 'Limit the number of entries to insert in the db at once',
  },
  baseRandomThrottleNumber: {
    type: 'number',
    describe: 'Set the random base random throttle number. The number will range between 1 and n+1',
  },
  loop: {
    type: 'number',
    describe: 'If set the program will loop and parse all blocks every x seconds',
  },
});

const { sequelize } = require('../models');

const umzug = new Umzug({
  migrations: [
    blockMigration,
    deployMigration,
    fullStatsMigration,
    fromIndex,
  ],
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
} as any);

/**
 * Used to loop parse all blocks for a given interval
 * @param blockParser
 * @param interval
 */
function parseLoop(blockParser: BlockParser, interval: number) {
  setTimeout(async () => {
    await blockParser.parseAllBlocks();

    parseLoop(blockParser, interval);
  }, interval * 1000);
}

/**
 * Main function as an entrypoint
 * Will run all migrations & launch the parse all blocks function.
 */
(async () => {
  const argv = await parser.argv;
  await umzug.up();
  const deploys = new Deploys();

  if (argv.rpc !== undefined || process.env.RPC_URL !== undefined) {
    const rpc = argv.rpc as string || process.env.RPC_URL as string;
    const interval = argv.loop as number || parseInt(process.env.LOOP as string, 10);

    if (!rpc.match(/^https?:\/\/.*/)) {
      console.log('RPC url incorrect. Format : http(s)://[url] this should point directly to the rpc endpoint of your casper node.');
      return;
    }

    const config = new Config({
      limitBulkInsert: argv.limitBulkInsert as number,
      baseRandomThrottleNumber: argv.baseRandomThrottleNumber as number,
    });

    const blockParser = new BlockParser(
      rpc,
      new DeployParser(rpc, deploys, config),
      new Blocks(),
      deploys,
      config,
    );

    if (interval && interval > 0) {
      parseLoop(blockParser, interval);
    } else {
      await blockParser.parseAllBlocks();
    }
  } else {
    console.log('RPC_URL env variable is not set. You can also set the --rpc option.');
  }
})();
