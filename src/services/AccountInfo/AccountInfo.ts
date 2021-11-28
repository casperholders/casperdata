import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

/**
 * AccountInfo class
 * Represent a deploy for an AccountInfo smart contract call (MAKE)
 */
export default class AccountInfo {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      url: Helper.getArgAsString(deploy, 'url'),
    };
  }
}
