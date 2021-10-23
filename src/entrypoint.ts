import Deploys from './services/Deploys';
import { CasperClient, CasperServiceByJsonRPC } from 'casper-js-sdk';
import DeployParser from './deployParser';
import Blocks from './services/Blocks';
import BlockParser from './blockParser';
import yargs = require('yargs');
import Config from './Config';

require('dotenv').config();

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

const models = require('../models');

function parseLoop(blockParser: BlockParser, interval: number) {
  setTimeout(async () => {
    await blockParser.parseAllBlocks();

    parseLoop(blockParser, interval);
  }, interval * 1000);
}

(async () => {
  const argv = await parser.argv;
  await models.sequelize.sync();
  const deploys = new Deploys();

  if (argv.rpc !== undefined || process.env.RPC_URL !== undefined) {
    const rpc = argv.rpc || process.env.RPC_URL as string;
    const interval = argv.loop || parseInt(process.env.LOOP as string, 10);

    if (!rpc.match(/^https?:\/\/.*/)) {
      console.log('RPC url incorrect. Format : http(s)://[url] this should point directly to the rpc endpoint of your casper node.');
      return;
    }

    const casperClient = new CasperClient(rpc);
    const config = new Config({
      limitBulkInsert: argv.limitBulkInsert,
      baseRandomThrottleNumber: argv.baseRandomThrottleNumber,
    });

    const blockParser = new BlockParser(
      casperClient,
      new CasperServiceByJsonRPC(rpc),
      new DeployParser(casperClient, deploys, config),
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
