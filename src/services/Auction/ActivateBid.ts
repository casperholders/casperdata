import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class ActivateBid {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      validator_public_key: Helper.getArgAsPublicKey(deploy, 'validator_public_key'),
    };
  }
}
