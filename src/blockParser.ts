import ora from 'ora';
import Config from './Config';
import DeployParser from './deployParser';
import Helper from './helper';
import { CasperServiceByJsonRPC } from 'casper-js-sdk';
import Blocks from './services/Blocks';
import Deploys from './services/Deploys';
import makeEta from 'simple-eta';

const models = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Class BlockParser
 */
export default class BlockParser {
  deployParser: DeployParser;

  rpc: string;

  blocks: Blocks;

  deploys: Deploys;

  config: Config;

  /**
   * Constructor
   * @param rpc
   * @param deployParser
   * @param blocks
   * @param deploys
   * @param config
   */
  constructor(
    rpc: string,
    deployParser: DeployParser,
    blocks: Blocks,
    deploys: Deploys,
    config: Config,
  ) {
    this.rpc = rpc;
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
      return (await Helper.promiseWithTimeout(
        new CasperServiceByJsonRPC(this.rpc).getBlockInfoByHeight(height),
        10000,
      )).block;
    } catch (e) {
      const blockToFetch = await models.Block.findOne({
        where: {
          height,
        },
      });
      if (blockToFetch) {
        try {
          return (await Helper.promiseWithTimeout(
            new CasperServiceByJsonRPC(this.rpc).getBlockInfo(blockToFetch.hash),
            10000,
          )).block;
        } catch (error) {
          console.log(`Cannot fetch block ${blockToFetch.hash}`);
          throw error;
        }
      }
      console.log(`Cannot fetch block ${height}`);
      throw e;
    }
  }

  /**
   * Parse block and push deploys to be parsed
   * @param height
   * @param preFetchedBlock
   * @param retry
   */
  async parseBlock(height: number, preFetchedBlock?: any, retry: number = 0) {
    try {
      await this.parseAndFetchBlock(height, preFetchedBlock);
    } catch (e) {
      if (e instanceof Error && e.message === 'Promise timed out') {
        console.log(`\nRetry block ${height} not found. Timeout.`);
      } else {
        console.log(`\nRetry block ${height} not found.`);
      }
      if (retry < 5) {
        await Helper.sleep(Math.floor(Math.random() * 5000));
        await this.parseBlock(height, preFetchedBlock, retry + 1);
      } else {
        console.log(`\nSkipping block ${height} too much timeout.`);
      }
    }
  }

  async parseAndFetchBlock(height: number, preFetchedBlock?: any) {
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
  }

  /**
   * Parse an interval of blocks
   * @param start
   * @param end
   */
  async parseInterval(start: number, end: number) {
    let i = start;
    let blockSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Block parsed ${i} out of ${end}`,
    }).start();
    const promises = [];
    let promisesResolved = i;
    const eta = makeEta();
    /* eslint-disable no-await-in-loop */
    for (i; i <= end; i++) {
      if (i % this.config.limitBulkInsert === 0) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        const interval = setInterval(() => {
          blockSpinner.text = `Block parsed ${promisesResolved} out of ${end}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
        }, 100);
        await Promise.allSettled(promises);
        clearInterval(interval);
        blockSpinner = blockSpinner.stopAndPersist({
          symbol: '🕐',
          text: `Block parsed ${promisesResolved} out of ${end}. Waiting for all of them to be parsed and bulk insert them into the DB.`,
        });
        await this.blocks.bulkCreate();
        await this.deployParser.parseAllDeploys();
        blockSpinner.start(`Block parsed ${promisesResolved} out of ${end}. Aprox. ${eta.estimate().toFixed(0)} seconds left`);
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 5);
      promises.push(
        this.parseBlock(i)
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          .finally(() => promisesResolved++ && eta.report(promisesResolved / end)),
      );
      blockSpinner.text = `Block parsed ${promisesResolved} out of ${end}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }
    const intervalSettled = setInterval(() => {
      blockSpinner.text = `Block parsed ${promisesResolved} out of ${end}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }, 100);
    /* eslint-enable no-await-in-loop */
    await Promise.allSettled(promises);
    clearInterval(intervalSettled);
    blockSpinner.text = `Block parsed ${promisesResolved} out of ${end}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
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
    let promisesResolved = blockCount;
    let blockSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Block parsed ${promisesResolved} out of ${missingBlocks.length}`,
    }).start();
    const promises = [];
    const eta = makeEta();
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const missingBlock of missingBlocks) {
      if (blockCount % this.config.limitBulkInsert === 0) {
        // eslint-disable-next-line @typescript-eslint/no-loop-func
        const interval = setInterval(() => {
          blockSpinner.text = `Block parsed ${promisesResolved} out of ${missingBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
        }, 100);
        await Promise.allSettled(promises);
        clearInterval(interval);
        blockSpinner = blockSpinner.stopAndPersist({
          symbol: '🕐',
          text: `Block parsed ${promisesResolved} out of ${missingBlocks.length}. Waiting for all of them to be parsed and bulk insert them into the DB.`,
        });
        await this.blocks.bulkCreate();
        await this.deployParser.parseAllDeploys();
        blockSpinner.start(`Block parsed ${promisesResolved} out of ${missingBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`);
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 5);
      promises.push(
        this.parseBlock(missingBlock)
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          .finally(() => promisesResolved++ && eta.report(promisesResolved / missingBlocks.length)),
      );
      blockCount++;
      blockSpinner.text = `Block parsed ${promisesResolved} out of ${missingBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }
    const intervalSettled = setInterval(() => {
      blockSpinner.text = `Block parsed ${promisesResolved} out of ${missingBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }, 100);
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    await Promise.allSettled(promises);
    clearInterval(intervalSettled);
    blockSpinner.text = `Block parsed ${promisesResolved} out of ${missingBlocks.length}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
    await this.blocks.bulkCreate();
    blockSpinner.succeed('All blocks parsed.');
    await this.deployParser.parseAllDeploys();
  }

  /**
   * Find missing blocks
   */
  findMissingBlock() {
    return models.sequelize.query('SELECT generate_series( (SELECT MIN(height) FROM "blocks"), (SELECT MAX(height) FROM "blocks") ) AS missing EXCEPT SELECT height FROM "blocks" ORDER BY missing ASC;', { type: QueryTypes.SELECT });
  }

  /**
   * Validate all blocks
   */
  async validateBlocks() {
    const unvalidatedBlocks = await models.Block.findAll({
      where: {
        validated: false,
      },
    });

    if (unvalidatedBlocks.length > 0) {
      let blockCount = 0;
      let promisesResolved = 0;
      let blockSpinner = ora({
        stream: process.stdout,
        isEnabled: true,
        text: `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}`,
      }).start();
      const promises = [];
      const eta = makeEta();
      /* eslint-disable no-await-in-loop, no-restricted-syntax */
      for (const unvalidatedBlock of unvalidatedBlocks) {
        if (blockCount % this.config.limitBulkInsert === 0) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          const interval = setInterval(() => {
            blockSpinner.text = `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
          }, 100);
          await Promise.allSettled(promises);
          clearInterval(interval);
          blockSpinner = blockSpinner.stopAndPersist({
            symbol: '🕐',
            text: `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Waiting to parse missing deploys.`,
          });
          await this.deployParser.parseAllDeploys();
          blockSpinner.start(`Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Waiting to bulk insert blocks & deploys.`);
          await this.deploys.bulkCreate();
          await this.blocks.bulkCreate();
        }
        await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 5);
        promises.push(
          this.validateBlock(unvalidatedBlock)
            .finally(
              // eslint-disable-next-line @typescript-eslint/no-loop-func
              () => promisesResolved++ && eta.report(promisesResolved / unvalidatedBlocks.length),
            ),
        );
        blockCount++;
        blockSpinner.text = `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
      }
      const intervalSettled = setInterval(() => {
        blockSpinner.text = `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
      }, 100);
      /* eslint-enable no-await-in-loop, no-restricted-syntax */
      await Promise.allSettled(promises);
      clearInterval(intervalSettled);
      blockSpinner = blockSpinner.stopAndPersist({
        symbol: '🕐',
        text: `Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Waiting to parse missing deploys.`,
      });
      await this.deployParser.parseAllDeploys();
      blockSpinner.start(`Block validated ${promisesResolved} out of ${unvalidatedBlocks.length}. Waiting to bulk insert missing deploys & validated blocks.`);
      await this.deploys.bulkCreate();
      await this.blocks.bulkCreate();
      blockSpinner.succeed('All blocks validated.');
    }
  }

  /**
   * Validate a given block. Search in the db if all transfers are present in the db.
   * @param block
   */
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
      console.log(`\n${missingBlocks.length} blocks missing in the database. Will fetch them first and resume the sync right after.\n`);
      await this.parseArray(missingBlocks.map(
        (missingBlock: any) => Number(missingBlock.missing),
      ));
      console.log('\nResuming sync now.\n');
    }

    const latestBlock = await new CasperServiceByJsonRPC(this.rpc).getLatestBlockInfo();
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
