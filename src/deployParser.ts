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
import makeEta from 'simple-eta';

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
   * @param rpc
   * @param deploys
   * @param config
   */
  constructor(rpc: string, deploys: Deploys, config: Config) {
    this.casperClient = new CasperClient(rpc);
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
   * @param retry
   */
  async parseDeploy(deployHash: string, blockHash: string, retry: number = 0) {
    try {
      const deploy = await Helper.promiseWithTimeout(
        this.casperClient.getDeploy(deployHash),
        5000,
      );
      if (deploy[0].session.isModuleBytes()) {
        this.parseModuleDeploy(deploy, blockHash);
      } else {
        this.parseStandardDeploy(deploy, blockHash);
      }
    } catch (e) {
      if ((e instanceof Error && e.message === 'Promise timed out')) {
        console.log(`\nFailed to fetch deploy : ${deployHash}. Timeout. Retry ${retry} out of 5`);
        if (retry < 5) {
          await Helper.sleep(Math.floor(Math.random() * 5000));
          await this.parseDeploy(deployHash, blockHash, retry + 1);
        }
      } else {
        console.log(`\nFailed to fetch deploy : ${deployHash} ${e}`);
        console.log(e);
      }
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
        console.log(`\nUnknown deploy : ${deploy[1].deploy.hash}`);
    }

    this.deploys.parseDeployData(deploy, blockHash, type, data);
  }

  /**
   * Parse transfer
   * @param transferHash
   * @param blockHash
   * @param retry
   */
  async storeTransfer(transferHash: string, blockHash: string, retry: number = 0) {
    try {
      const transfer = await Helper.promiseWithTimeout(
        this.casperClient.getDeploy(transferHash),
        5000,
      );

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
      if (e instanceof Error && e.message === 'Promise timed out') {
        if (retry < 5) {
          await Helper.sleep(Math.floor(Math.random() * 5000));
          await this.storeTransfer(transferHash, blockHash, retry + 1);
        } else {
          console.log(`\nFailed to retrieve transfer ${transferHash}. Timeout. Retry ${retry} out of 5`);
        }
      } else {
        console.log(`\nFailed to retrieve transfer ${transferHash}`);
        console.log(e);
      }
    }
  }

  /**
   * Parse all deploys
   */
  async parseAllDeploys() {
    const promises: any[] = [];
    let promisesResolved = 0;
    let throttleCounter = 0;
    let totalDeploys = 0;
    Object.values(this.deploysToParse)
      .forEach((item) => {
        totalDeploys += item.deploy_hashes.length;
      });

    const deploySpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Deploy parsed ${promisesResolved} out of ${totalDeploys}`,
    }).start();
    const eta = makeEta();
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const [hash, deploys] of Object.entries(this.deploysToParse)) {
      for (const deployHash of deploys.deploy_hashes) {
        await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 5);
        promises.push(
          this.parseDeploy(deployHash, hash)
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            .finally(() => promisesResolved++ && eta.report(promisesResolved / totalDeploys)),
        );
        throttleCounter++;
        deploySpinner.text = `Deploy parsed ${promisesResolved} out of ${totalDeploys}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
        if (throttleCounter % this.config.limitBulkInsert === 0) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          const updateSpinner = setInterval(() => {
            deploySpinner.text = `Deploy parsed ${promisesResolved} out of ${totalDeploys}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
          }, 100);
          await Promise.allSettled(promises);
          clearInterval(updateSpinner);
          deploySpinner.text = `Deploy parsed ${promisesResolved} out of ${totalDeploys}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
          await this.deploys.bulkCreate();
          promises.length = 0;
        }
      }
    }
    const updateDeploySpinnerSettled = setInterval(() => {
      deploySpinner.text = `Deploy parsed ${promisesResolved} out of ${totalDeploys}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }, 100);
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    await Promise.allSettled(promises);
    clearInterval(updateDeploySpinnerSettled);
    deploySpinner.text = `Deploy parsed ${promisesResolved} out of ${totalDeploys}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
    await this.deploys.bulkCreate();
    deploySpinner.succeed(`Deploy parsed ${promisesResolved} out of ${totalDeploys}. All deploys parsed.`);

    promises.length = 0;
    promisesResolved = 0;
    let totalTransfers = 0;
    Object.values(this.deploysToParse)
      .forEach((item) => {
        totalTransfers += item.transfer_hashes.length;
      });
    eta.report(promisesResolved / totalTransfers);
    const transferSpinner = ora({
      stream: process.stdout,
      isEnabled: true,
      text: `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Aprox. ${eta.estimate().toFixed(0)} seconds left`,
    }).start();
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const [hash, deploys] of Object.entries(this.deploysToParse)) {
      for (const deployHash of deploys.transfer_hashes) {
        await Helper.sleep(Math.floor(Math.random() * this.config.baseRandomThrottleNumber) + 5);
        promises.push(
          this.storeTransfer(deployHash, hash)
            // eslint-disable-next-line @typescript-eslint/no-loop-func
            .finally(() => promisesResolved++ && eta.report(promisesResolved / totalTransfers)),
        );
        throttleCounter++;
        transferSpinner.text = `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
        if (throttleCounter % this.config.limitBulkInsert === 0) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func
          const updateSpinnerThrottle = setInterval(() => {
            transferSpinner.text = `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
          }, 100);
          await Promise.allSettled(promises);
          clearInterval(updateSpinnerThrottle);
          transferSpinner.text = `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
          await this.deploys.bulkCreate();
          promises.length = 0;
        }
      }
    }
    const updateSpinnerSettled = setInterval(() => {
      transferSpinner.text = `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Aprox. ${eta.estimate().toFixed(0)} seconds left`;
    }, 100);
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
    await Promise.allSettled(promises);
    clearInterval(updateSpinnerSettled);
    transferSpinner.text = `Transfer parsed ${promisesResolved} out of ${totalTransfers}. Waiting for all of them to be parsed and bulk insert them into the DB.`;
    await this.deploys.bulkCreate();
    Object.getOwnPropertyNames(this.deploysToParse).forEach((prop) => {
      delete this.deploysToParse[prop];
    });
    transferSpinner.succeed(`Transfer parsed ${promisesResolved} out of ${totalTransfers}. All transfers parsed.`);
    promises.length = 0;
  }
}
