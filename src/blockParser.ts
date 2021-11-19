import ora from 'ora';
import Config from './Config';
import DeployParser from './deployParser';
import Helper from './helper';
import { CasperClient, CasperServiceByJsonRPC } from 'casper-js-sdk';
import Blocks from './services/Blocks';
import Deploys from './services/Deploys';

const models = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Class BlockParser
 */
export default class BlockParser {
  deployParser: DeployParser;

  casperClient: CasperClient;

  casperServiceByJsonRPC: CasperServiceByJsonRPC;

  blocks: Blocks;

  deploys: Deploys;

  config: Config;

  /**
   * Constructor
   * @param casperClient
   * @param casperRpc
   * @param deployParser
   * @param blocks
   * @param deploys
   * @param config
   */
  constructor(
    casperClient: CasperClient,
    casperRpc: CasperServiceByJsonRPC,
    deployParser: DeployParser,
    blocks: Blocks,
    deploys: Deploys,
    config: Config,
  ) {
    this.casperClient = casperClient;
    this.casperServiceByJsonRPC = casperRpc;
    this.deployParser = deployParser;
    this.blocks = blocks;
    this.deploys = deploys;
    this.config = config;
  }

  /**
   * Fetch a block from the network
   * @param height
   */
  async fetchBlock(height: number) {
    try {
      return (await this.casperServiceByJsonRPC.getBlockInfoByHeight(height)).block;
    } catch (e) {
      const blockToFetch = await models.Block.findOne({
        where: {
          height,
        },
      });
      if (blockToFetch) {
        return (await this.casperServiceByJsonRPC.getBlockInfo(blockToFetch.hash)).block;
      }
      throw e;
    }
  }

  /**
   * Parse block and push deploys to be parsed
   * @param height
   * @param preFetchedBlock
   */
  async parseBlock(height: number, preFetchedBlock?: any) {
    try {
      const block = preFetchedBlock || await this.fetchBlock(height);
      let eraEnd = false;
      if (block.header.era_end) {
        eraEnd = true;
      }

      const allDeploys = [...block.body.deploy_hashes, ...block.body.transfer_hashes];
      if (allDeploys.length > 0) {
        const count = await models.Deploy.count({
          where: {
            hash: allDeploys,
          },
        });
        if (count === allDeploys.length) {
          this.blocks.upsertBlock(block, eraEnd, true);
        } else {
          this.blocks.upsertBlock(block, eraEnd, false);
          this.deployParser.pushDeploysToParse(block.hash, {
            deploy_hashes: block.body.deploy_hashes,
            transfer_hashes: block.body.transfer_hashes,
          });
        }
      } else {
        this.blocks.upsertBlock(block, eraEnd, true);
      }
    } catch (e) {
      console.log(e);
      console.log(`Retry block ${height} not found.`);
      await Helper.sleep(5000);
      await this.parseBlock(height, preFetchedBlock);
    }
  }

  /**
   * Parse an interval of blocks
   * @param start
   * @param end
   */
  async parseInterval(start: number, end: number) {
    let i = start;
    const blockSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Block parsed ${i} out of ${end}`,
    }).start();
    const promises = [];
    /* eslint-disable no-await-in-loop */
    for (i; i <= end; i++) {
      if (i % this.config.limitBulkInsert === 0) {
        blockSpinner.text = `Block parsed ${i} out of ${end}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
        await Promise.all(promises);
        await this.blocks.bulkCreate();
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 1);
      promises.push(this.parseBlock(i));
      blockSpinner.text = `Block parsed ${i} out of ${end}`;
    }
    /* eslint-enable no-await-in-loop */
    blockSpinner.text = 'Waiting to parse all blocks... This might take a while.';
    await Promise.all(promises);
    await this.blocks.bulkCreate();
    blockSpinner.succeed('All blocks parsed.');

    await this.deployParser.parseAllDeploys();
  }

  /**
   * Parse an array of blocks
   * @param missingBlocks
   */
  async parseArray(missingBlocks: number[]) {
    let blockCount = 0;
    const blockSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Block parsed ${blockCount} out of ${missingBlocks.length}`,
    }).start();
    const promises = [];
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const missingBlock of missingBlocks) {
      if (blockCount % this.config.limitBulkInsert === 0) {
        blockSpinner.text = `Block parsed ${blockCount} out of ${missingBlocks.length}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
        await Promise.all(promises);
        await this.blocks.bulkCreate();
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 1);
      promises.push(this.parseBlock(missingBlock));
      blockCount++;
      blockSpinner.text = `Block parsed ${blockCount} out of ${missingBlocks.length}`;
    }
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    blockSpinner.text = 'Waiting to parse all blocks... This might take a while.';
    await Promise.all(promises);
    await this.blocks.bulkCreate();
    blockSpinner.succeed('All blocks parsed.');
    await this.deployParser.parseAllDeploys();
  }

  findMissingBlock() {
    return models.sequelize.query('SELECT generate_series( (SELECT MIN(height) FROM "blocks"), (SELECT MAX(height) FROM "blocks") ) AS missing EXCEPT SELECT height FROM "blocks" ORDER BY missing ASC;', { type: QueryTypes.SELECT });
  }

  async validateBlocks() {
    const unvalidatedBlocks = await models.Block.findAll({
      where: {
        validated: false,
      },
    });

    if (unvalidatedBlocks.length > 0) {
      let blockCount = 0;
      const blockSpinner = ora({
        stream: process.stdout,
        isEnabled: true,
        text: `Block validated ${blockCount} out of ${unvalidatedBlocks.length}`,
      }).start();
      const promises = [];
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      for (const unvalidatedBlock of unvalidatedBlocks) {
        if (blockCount % this.config.limitBulkInsert === 0) {
          blockSpinner.text = `Block validated ${blockCount} out of ${unvalidatedBlocks.length}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
          await Promise.all(promises);
          await this.deployParser.parseAllDeploys();
          await this.blocks.bulkCreate();
          await this.deploys.bulkCreate();
        }
        promises.push(this.validateBlock(unvalidatedBlock));
        blockCount++;
        blockSpinner.text = `Block validated ${blockCount} out of ${unvalidatedBlocks.length}`;
        await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 1);
      }
      /* eslint-enable no-await-in-loop, no-restricted-syntax */
      blockSpinner.text = 'Waiting to validate all blocks... This might take a while.';
      await Promise.all(promises);
      await this.deployParser.parseAllDeploys();
      blockSpinner.succeed('All blocks validated.');
      await this.blocks.bulkCreate();
      await this.deploys.bulkCreate();
    }
  }

  async validateBlock(block: any) {
    try {
      const blockFetch = (await this.fetchBlock(block.height)) as any;

      const allDeploys = [...blockFetch.body.deploy_hashes, ...blockFetch.body.transfer_hashes];
      let count = 0;
      if (allDeploys.length > 0) {
        count = await models.Deploy.count({
          where: {
            hash: allDeploys,
          },
        });
      }
      if (count === allDeploys.length) {
        this.blocks.updateValidateBlock(block);
      } else {
        console.log(`Missing ${allDeploys.length - count} deploys out of ${allDeploys.length} for block ${block.height}`);
        await this.parseBlock(block.height, blockFetch);
      }
    } catch (e) {
      console.log(e);
      await this.validateBlock(block);
    }
  }

  /**
   * Parse all blocks
   */
  async parseAllBlocks() {
    const missingBlocks: any = await this.findMissingBlock();
    if (missingBlocks.length > 0) {
      await this.parseArray(missingBlocks.map(
        (missingBlock: any) => Number(missingBlock.missing),
      ));
    }

    const latestBlock = await this.casperServiceByJsonRPC.getLatestBlockInfo();
    if (latestBlock.block == null) {
      console.log('Unable to retrieve last block from the blockchain');
      return;
    }
    const end = latestBlock.block.header.height;
    const lastBlock = await models.Block.findOne({
      order: [['height', 'DESC']],
    });
    let start = 0;
    if (lastBlock) {
      start = lastBlock.height;
    }
    if (start === end) {
      console.log(`All block parsed. Latest block : ${start}`);
      return;
    }
    console.log(`Last block in database : ${start}. Blocks to parse : ${end - start}`);
    await this.parseInterval(start, end);
    await this.validateBlocks();
  }
}
