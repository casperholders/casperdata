import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class Faucet {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      target: Helper.accountHashHex(deploy),
      amount: Helper.getArgAsString(deploy, 'amount'),
    };
  }
}
