import ora from 'ora';
import Config from './Config';
import Helper from './helper';
import { Deploy, ModuleBytes } from 'casper-js-sdk/dist/lib/DeployUtil';
import { CasperClient, GetDeployResult } from 'casper-js-sdk';
import Delegate from './services/Auction/Delegate';
import Undelegate from './services/Auction/Undelegate';
import AddBid from './services/Auction/AddBid';
import WithdrawBid from './services/Auction/WithdrawBid';
import ActivateBid from './services/Auction/ActivateBid';
import KeyManagement from './services/KeyManagement/KeyManagement';
import KeyWeight from './services/KeyManagement/KeyWeight';
import KeyManagementThreshold from './services/KeyManagement/KeyManagementThreshold';
import SimpleTransfer from './services/Transfer/SimpleTransfer';
import AccountInfo from './services/AccountInfo/AccountInfo';
import Faucet from './services/Faucet/Faucet';
import Deploys from './services/Deploys';
import ERC20 from './services/ERC20/ERC20';

const models = require('../models');

/**
 * Storage for deploys within a block
 */
interface BlockDeploys {
  deploy_hashes: [],
  transfer_hashes: [],
}

/**
 * Storage of deploys of many blocks
 */
interface BlocksDeploys {
  [key: string]: BlockDeploys;
}

/**
 * DeployParser Class
 * Used to parse one or many deploys
 */
export default class DeployParser {
  deploysToParse: BlocksDeploys = {};

  casperClient: CasperClient;

  deploys: Deploys;

  config: Config;

  /**
   * Constructor
   * @param casperClient
   * @param deploys
   * @param config
   */
  constructor(casperClient: CasperClient, deploys: Deploys, config: Config) {
    this.casperClient = casperClient;
    this.deploys = deploys;
    this.config = config;
  }

  /**
   * Add entry in the deploysToParse property
   * @param hash
   * @param blockDeploys
   */
  pushDeploysToParse(hash: string, blockDeploys: BlockDeploys) {
    this.deploysToParse[hash] = blockDeploys;
  }

  /**
   * Helper method to sum
   * @param prev
   * @param next
   */
  sum(prev: number, next: number) {
    return prev + next;
  }

  /**
   * Fetch & parse deploy for a given hash
   * @param deployHash
   * @param blockHash
   */
  async parseDeploy(deployHash: string, blockHash: string) {
    try {
      const deploy = await this.casperClient.getDeploy(deployHash);
      if (deploy[0].session.isModuleBytes()) {
        this.parseModuleDeploy(deploy, blockHash);
      } else {
        this.parseStandardDeploy(deploy, blockHash);
      }
    } catch (e) {
      console.log(`Failed to fetch deploy : ${deployHash}`);
      console.log(e);
    }
  }

  /**
   * Parse a module deploy
   * @param deploy
   * @param blockHash
   */
  parseModuleDeploy(deploy: [Deploy, GetDeployResult], blockHash: string) {
    const moduleBytes = deploy[0].session.asModuleBytes() as ModuleBytes;

    let data = {};
    let type: string = Deploys.UNKNOWN;

    // Staking op
    if (moduleBytes.args.args.has('delegator') && moduleBytes.args.args.has('validator') && moduleBytes.args.args.has('amount')) {
      const cost = Helper.getCost(deploy);
      if (Number(cost) > 1) {
        data = Delegate.parseData(deploy);
        type = Deploys.DELEGATE;
      } else {
        data = Undelegate.parseData(deploy);
        type = Deploys.UNDELEGATE;
      }
    }
    // Add bid
    if (moduleBytes.args.args.has('delegation_rate')) {
      data = AddBid.parseData(deploy);
      type = Deploys.ADD_BID;
    }
    // Withdraw bid
    if (moduleBytes.args.args.has('public_key') && moduleBytes.args.args.has('amount')) {
      data = WithdrawBid.parseData(deploy);
      type = Deploys.WITHDRAW_BID;
    }
    // Activate bid
    if (moduleBytes.args.args.has('validator_public_key') && moduleBytes.args.args.size === 1) {
      data = ActivateBid.parseData(deploy);
      type = Deploys.ACTIVATE_BID;
    }

    // Key Management
    if (moduleBytes.args.args.has('action') && moduleBytes.args.args.has('deployment_thereshold') && moduleBytes.args.args.has('key_management_threshold')) {
      data = KeyManagement.parseData(deploy);
      type = Deploys.KEY_MANAGEMENT;
    }

    // Key Weight
    if (moduleBytes.args.args.has('action') && moduleBytes.args.args.has('account') && moduleBytes.args.args.has('weight') && moduleBytes.args.args.size === 3) {
      data = KeyWeight.parseData(deploy);
      type = Deploys.KEY_WEIGHT;
    }

    // Key Management Threshold
    if (moduleBytes.args.args.has('action') && moduleBytes.args.args.has('weight') && moduleBytes.args.args.size === 2) {
      data = KeyManagementThreshold.parseData(deploy);
      type = Deploys.KEY_MANAGEMENT_THRESHOLD;
    }

    // Simple Transfer
    if (moduleBytes.args.args.has('target') && moduleBytes.args.args.has('amount') && moduleBytes.args.args.size === 2) {
      data = SimpleTransfer.parseData(deploy);
      type = Deploys.SIMPLE_TRANSFER;
    }

    // ERC20
    if (moduleBytes.args.args.has('token_name') && moduleBytes.args.args.has('token_symbol')) {
      data = ERC20.parseData(deploy);
      type = Deploys.ERC20_TOKEN;
    }

    // No args
    if (moduleBytes.args.args.size === 0) {
      data = {};
      type = Deploys.WASM_DEPLOY;
    }

    this.deploys.parseDeployData(deploy, blockHash, type, data);
  }

  /**
   * Parse standard deploy
   * @param deploy
   * @param blockHash
   */
  parseStandardDeploy(deploy: [Deploy, GetDeployResult], blockHash: string) {
    let data = {};
    let type: string = Deploys.UNKNOWN;

    let session = deploy[0].session as any;
    let name: string = '';

    if (session.isStoredContractByName()) {
      session = session.asStoredContractByName();
      name = session.name;
    } else if (session.isStoredContractByHash()) {
      session = session.asStoredContractByHash();
    } else if (session.isStoredVersionContractByName()) {
      session = session.asStoredVersionContractByName();
      name = session.name;
    } else if (session.isStoredVersionContractByHash()) {
      session = session.asStoredVersionContractByHash();
    }

    switch (session.entryPoint) {
      case 'delegate':
        data = Delegate.parseData(deploy);
        type = Deploys.DELEGATE;
        break;
      case 'undelegate':
        data = Undelegate.parseData(deploy);
        type = Deploys.UNDELEGATE;
        break;
      case 'add_bid':
        data = AddBid.parseData(deploy);
        type = Deploys.ADD_BID;
        break;
      case 'withdraw_bid':
        data = WithdrawBid.parseData(deploy);
        type = Deploys.WITHDRAW_BID;
        break;
      case 'set_url':
        data = AccountInfo.parseData(deploy);
        type = Deploys.ACCOUNT_INFO;
        break;
      case 'store_signature':
        if (name === 'caspersign_contract') {
          type = Deploys.CASPER_SIGN_CONTRACT;
        }
        break;
      case 'call_faucet':
        if (name === 'faucet') {
          data = Faucet.parseData(deploy);
          type = Deploys.FAUCET;
        }
        break;
      default:
        console.log(`Unknown deploy : ${deploy[1].deploy.hash}`);
    }

    this.deploys.parseDeployData(deploy, blockHash, type, data);
  }

  /**
   * Parse deploys of a block that doesn't exist in the database
   * @param hash
   * @param deploys
   */
  async parseDeploysOfBlock(hash: string, deploys: []) {
    await Promise.all(
      deploys.map(async (deployHash) => {
        const exist = await models.Deploy.findOne({ where: { hash: deployHash } });
        if (exist === null) {
          await this.parseDeploy(deployHash, hash);
        }
      }),
    );
  }

  /**
   * Parse transfer
   * @param transferHash
   * @param blockHash
   */
  async storeTransfer(transferHash: string, blockHash: string) {
    try {
      const transfer = await this.casperClient.getDeploy(transferHash);

      const id = Helper.getId(transfer);

      const data = {
        hash: transfer[1].deploy.hash,
        amount: Helper.getArgAsString(transfer, 'amount'),
        from: transfer[1].deploy.header.account,
        target: Helper.accountHashHex(transfer),
        id,
      };

      this.deploys.parseDeployData(transfer, blockHash, Deploys.TRANSFER, data);
    } catch (e) {
      console.log(`Failed to retrieve transfer ${transferHash}`);
      console.log(e);
    }
  }

  /**
   * Parse transfers of a block
   * @param hash
   * @param transfers
   */
  async parseTransfersOfBlock(hash: string, transfers: []) {
    await Promise.all(
      transfers.map(async (transferHash) => {
        const exist = await models.Deploy.findOne({ where: { hash: transferHash } });
        if (exist === null) {
          await this.storeTransfer(transferHash, hash);
        }
      }),
    );
  }

  /**
   * Parse all deploys
   */
  async parseAllDeploys() {
    let i = 0;
    let promises = [];
    let throttleCounter = 0;
    const totalDeploys = Object.values(this.deploysToParse)
      .map((item) => item.deploy_hashes.length)
      .reduce(this.sum, 0 as number);
    const deploySpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Deploy parsed ${i} out of ${totalDeploys}`,
    }).start();
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const [hash, deploys] of Object.entries(this.deploysToParse)) {
      if (throttleCounter > this.config.limitBulkInsert) {
        deploySpinner.text = `Deploy parsed ${i} out of ${totalDeploys}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
        await Promise.all(promises);
        await this.deploys.bulkCreate();
        throttleCounter = 0;
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 1);
      promises.push(this.parseDeploysOfBlock(hash, deploys.deploy_hashes));
      i += deploys.deploy_hashes.length;
      throttleCounter += deploys.deploy_hashes.length;
      deploySpinner.text = `Deploy parsed ${i} out of ${totalDeploys}`;
    }
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    deploySpinner.text = 'Waiting to parse all deploys... This might take a while.';
    await Promise.all(promises);
    await this.deploys.bulkCreate();
    deploySpinner.succeed('All deploys parsed.');

    promises = [];
    i = 0;
    const totalTransfers = Object.values(this.deploysToParse)
      .map((item) => item.transfer_hashes.length)
      .reduce(this.sum, 0 as number);
    const transferSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Transfer parsed ${i} out of ${totalTransfers}`,
    }).start();
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const [hash, deploys] of Object.entries(this.deploysToParse)) {
      if (throttleCounter > this.config.limitBulkInsert) {
        transferSpinner.text = `Transfer parsed ${i} out of ${totalTransfers}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
        await Promise.all(promises);
        await this.deploys.bulkCreate();
        throttleCounter = 0;
      }
      await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 1);
      promises.push(this.parseTransfersOfBlock(hash, deploys.transfer_hashes));
      i += deploys.transfer_hashes.length;
      throttleCounter += deploys.transfer_hashes.length;
      transferSpinner.text = `Transfer parsed ${i} out of ${totalTransfers}`;
    }
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    transferSpinner.text = 'Waiting to parse all transfers... This might take a while.';
    await Promise.all(promises);
    await this.deploys.bulkCreate();
    transferSpinner.succeed('All transfers parsed.');
  }
}
