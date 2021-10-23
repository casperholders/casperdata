import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../helper';

const models = require('../../models');

export default class Deploys {
  static TRANSFER = 'transfer';

  static SIMPLE_TRANSFER = 'simpleTransfer';

  static ADD_BID = 'addBid';

  static WITHDRAW_BID = 'withdrawBid';

  static DELEGATE = 'delegate';

  static UNDELEGATE = 'undelegate';

  static UNKNOWN = 'unknown';

  static ACTIVATE_BID = 'activateBid';

  static ACCOUNT_INFO = 'accountInfo';

  static WASM_DEPLOY = 'wasmDeploy';

  static KEY_MANAGEMENT = 'keyManagement';

  static KEY_WEIGHT = 'keyWeight';

  static KEY_MANAGEMENT_THRESHOLD = 'keyManagementThreshold';

  static CASPER_SIGN_CONTRACT = 'casperSignContract';

  static ERC20_TOKEN = 'ERC20';

  static FAUCET = 'faucet';

  data: {
    hash: string;
    from: string;
    cost: number | undefined;
    result: boolean;
    timestamp: Date;
    block: string;
    type: string;
    data: object;
  }[] = [];

  parseDeployData(
    deploy: [Deploy, GetDeployResult],
    blockHash: string,
    type: string,
    deployData: object,
  ) {
    try {
      const cost = Helper.getCost(deploy);
      this.data.push({
        hash: deploy[1].deploy.hash,
        from: deploy[1].deploy.header.account,
        cost,
        result: Helper.getResult(deploy),
        timestamp: new Date(deploy[1].deploy.header.timestamp),
        block: blockHash,
        type,
        data: deployData,
      });
    } catch (e) {
      console.log(`Cannot create deploy : ${deploy[1].deploy.hash}`);
      console.log(e);
    }
  }

  async bulkCreate() {
    await models.Deploy.bulkCreate(this.data, {
      fields: ['hash', 'from', 'cost', 'result', 'timestamp', 'block', 'type', 'data'],
      updateOnDuplicate: ['from', 'cost', 'result', 'timestamp', 'block', 'type', 'data'],
    });
    this.data.length = 0;
  }
}
