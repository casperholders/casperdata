import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class KeyManagement {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      action: Helper.getArgAsString(deploy, 'action'),
      deployment_thereshold: Helper.getArgAsHex(deploy, 'deployment_thereshold'),
      key_management_threshold: Helper.getArgAsHex(deploy, 'key_management_threshold'),
    };
  }
}
