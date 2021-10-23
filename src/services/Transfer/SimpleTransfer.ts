import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class SimpleTransfer {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      amount: Helper.getArgAsString(deploy, 'amount'),
      target: Helper.accountHashHex(deploy),
    };
  }
}
