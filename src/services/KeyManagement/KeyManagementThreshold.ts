import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class KeyManagementThreshold {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      action: Helper.getArgAsString(deploy, 'action'),
      account: Helper.getArgAsStringWithBuffer(deploy, 'account'),
      weight: Helper.getArgAsHex(deploy, 'weight'),
    };
  }
}
