import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class Delegate {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      delegator: Helper.getArgAsPublicKey(deploy, 'delegator'),
      validator: Helper.getArgAsPublicKey(deploy, 'validator'),
      amount: Helper.getArgAsString(deploy, 'amount'),
    };
  }
}
