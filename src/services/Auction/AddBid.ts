import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class AddBid {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      publicKey: Helper.getArgAsPublicKey(deploy, 'public_key'),
      amount: Helper.getArgAsString(deploy, 'amount'),
      delegation_rate: Helper.getArgAsHex(deploy, 'delegation_rate'),
    };
  }
}
