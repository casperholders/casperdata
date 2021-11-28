import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

/**
 * SimpleTransfer class
 * Differ from a standard transfer as it has been done through a module deploy
 */
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
