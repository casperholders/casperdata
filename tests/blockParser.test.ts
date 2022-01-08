import Deploys from '../src/services/Deploys';
import {
  CasperClient,
  CasperServiceByJsonRPC,
  GetBlockResult,
  JsonBlock,
} from 'casper-js-sdk';
import DeployParser from '../src/deployParser';
import Blocks from '../src/services/Blocks';
import BlockParser from '../src/blockParser';
import Config from '../src/Config';

const models = require('../models');

jest.setTimeout(50000);

describe('Test blockParser class', () => {
  beforeAll(async () => {
    await models.sequelize.sync({ force: true });
    jest.spyOn(DeployParser.prototype, 'parseAllDeploys')
      .mockImplementation(() => new Promise((resolve) => {
        resolve();
      }));
  });

  it('Should retrieve a block', async () => {
    const deploys = new Deploys();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), new DeployParser(casperClient, deploys, config), new Blocks(), deploys, config);
    const block = await blockParser.fetchBlock(1);
    expect(block?.header.height).toEqual(1);
  });

  it('Should parse an interval', async () => {
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseInterval(0, 9);
    const databaseBlocks = await models.Block.findAll();

    expect(databaseBlocks.length).toEqual(10);
  });

  it('Should parse an array', async () => {
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const databaseBlocks = await models.Block.findAll();

    expect(databaseBlocks.length).toEqual(10);
  });

  it('Should have parsed all blocks', async () => {
    jest.spyOn(CasperServiceByJsonRPC.prototype, 'getLatestBlockInfo').mockImplementation(() => new Promise((resolve) => {
      resolve({
        block: {
          header: {
            height: 9,
          },
        } as any as JsonBlock,
      } as any as GetBlockResult);
    }));
    const mockParseArray = jest.spyOn(BlockParser.prototype, 'parseArray');
    mockParseArray.mockImplementation(() => new Promise((resolve) => {
      resolve();
    }));
    jest.spyOn(BlockParser.prototype, 'findMissingBlock')
      .mockImplementation(() => new Promise((resolve) => {
        resolve([
          {
            missing: 8,
          },
        ]);
      }));
    console.log = jest.fn();
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseAllBlocks();
    expect(mockParseArray).toHaveBeenCalledWith([8]);
    expect(console.log).toHaveBeenCalledWith('All block parsed. Latest block : 9');
  });

  it('Should have parsed all blocks', async () => {
    jest.spyOn(CasperServiceByJsonRPC.prototype, 'getLatestBlockInfo').mockImplementation(() => new Promise((resolve) => {
      resolve({
        block: {
          header: {
            height: 10,
          },
        } as any as JsonBlock,
      } as any as GetBlockResult);
    }));
    jest.spyOn(BlockParser.prototype, 'findMissingBlock')
      .mockImplementation(() => new Promise((resolve) => {
        resolve([]);
      }));
    const mockParseInterval = jest.spyOn(BlockParser.prototype, 'parseInterval');
    mockParseInterval.mockImplementation(() => new Promise((resolve) => {
      resolve();
    }));
    console.log = jest.fn();
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseAllBlocks();
    expect(console.log).toHaveBeenCalledWith('Last block in database : 9. Blocks to parse : 1');
    expect(mockParseInterval).toHaveBeenCalledWith(9, 10);
  });

  it('Should parse a block', async () => {
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseBlock(228359);
    expect(blocks.data.length).toEqual(1);
    expect(blocks.data[0].hash).toEqual('72e9cd709b111da9d1c3bfaf4e7a3eb1bb612e8d4a02fa8cf83fbb125d1924fb');
    expect(blocks.data[0].era).toEqual(2224);
    expect(blocks.data[0].timestamp).toEqual('2021-10-11T21:23:15.584Z');
    expect(blocks.data[0].height).toEqual(228359);
    expect(blocks.data[0].era_end).toEqual(false);
    expect(blocks.data[0].validated).toEqual(false);
    expect(deployParser.deploysToParse['72e9cd709b111da9d1c3bfaf4e7a3eb1bb612e8d4a02fa8cf83fbb125d1924fb'].deploy_hashes.length).toEqual(100);
    expect(deployParser.deploysToParse['72e9cd709b111da9d1c3bfaf4e7a3eb1bb612e8d4a02fa8cf83fbb125d1924fb'].transfer_hashes.length).toEqual(632);
  });

  it('Should parse a switch block', async () => {
    const mockBlockByHeight = jest.spyOn(CasperServiceByJsonRPC.prototype, 'getBlockInfoByHeight').mockImplementation(() => {
      mockBlockByHeight.mockRestore();
      return new Promise((resolve, reject) => {
        reject();
      });
    });
    const deploys = new Deploys();
    const blocks = new Blocks();
    const casperClient = new CasperClient('https://rpc.testnet.casperholders.com/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('https://rpc.testnet.casperholders.com/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseBlock(293733);
    expect(blocks.data.length).toEqual(1);
    expect(blocks.data[0].hash).toEqual('23881bc3d83ad39e5a9a93efbef1c5a2e810b2ed6e715660af23121af8ef61d0');
    expect(blocks.data[0].era).toEqual(2616);
    expect(blocks.data[0].timestamp).toEqual('2021-11-13T14:55:39.520Z');
    expect(blocks.data[0].height).toEqual(293733);
    expect(blocks.data[0].era_end).toEqual(true);
    expect(blocks.data[0].validated).toEqual(true);
    expect('23881bc3d83ad39e5a9a93efbef1c5a2e810b2ed6e715660af23121af8ef61d0' in deployParser.deploysToParse).toEqual(false);
  });
});
