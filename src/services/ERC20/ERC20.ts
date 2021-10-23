import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import { GetDeployResult } from 'casper-js-sdk';
import Helper from '../../helper';

export default class ERC20 {
  static parseData(
    deploy: [Deploy, GetDeployResult],
  ) {
    return {
      token_name: Helper.getArgAsString(deploy, 'token_name'),
      token_symbol: Helper.getArgAsString(deploy, 'token_symbol'),
      token_decimals: Helper.getArgAsHex(deploy, 'token_decimals'),
      token_total_supply: Helper.getArgAsHex(deploy, 'token_total_supply'),
      authorized_minter: Helper.getArgAsString(deploy, 'authorized_minter'),
    };
  }
}
