import { CLPublicKey, GetDeployResult } from 'casper-js-sdk';
import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';

/**
 * Helper class
 * Common functions to be used in different classes
 */
export default class Helper {
  /**
   * Get cost of a deploy
   * @param deploy
   */
  static getCost(deploy: [Deploy, GetDeployResult]) {
    if (Helper.getResult(deploy)) {
      return deploy[1].execution_results[0].result.Success?.cost;
    }
    return deploy[1].execution_results[0].result.Failure?.cost;
  }

  /**
   * Get result of a deploy
   * @param deploy
   */
  static getResult(deploy: [Deploy, GetDeployResult]) {
    return 'Success' in deploy[1].execution_results[0].result;
  }

  /**
   * Get arg by name from a deploy
   * @param deploy
   * @param arg
   */
  static deployGetArgByName(deploy: [Deploy, GetDeployResult], arg: string) {
    return deploy[0].session.getArgByName(arg);
  }

  /**
   * Get arg by name as a public key from a deploy
   * @param deploy
   * @param arg
   */
  static getArgAsPublicKey(deploy: [Deploy, GetDeployResult], arg: string) {
    const argument = Helper.deployGetArgByName(deploy, arg);
    if (argument && argument.clType().linksTo === CLPublicKey) {
      return (argument as CLPublicKey).toHex();
    }
    return '';
  }

  /**
   * Get arg by name as a string from a deploy
   * @param deploy
   * @param arg
   */
  static getArgAsString(deploy: [Deploy, GetDeployResult], arg: string) {
    const argument = Helper.deployGetArgByName(deploy, arg);
    if (argument && argument.value()?.toString()) {
      return argument.value().toString();
    }
    return '';
  }

  /**
   * Get arg by name as hex from a deploy
   * @param deploy
   * @param arg
   */
  static getArgAsHex(deploy: [Deploy, GetDeployResult], arg: string) {
    const argument = Helper.deployGetArgByName(deploy, arg);
    try {
      if (argument && argument.value()?.toHex()) {
        return argument.value().toHex();
      }
    } catch (e) {
      if (argument && argument.value().toBigInt()) {
        return argument.value().toBigInt().toString();
      }
    }
    return 0;
  }

  /**
   * Get arg by name as string that needs a buffer from a deploy
   * @param deploy
   * @param arg
   */
  static getArgAsStringWithBuffer(deploy: [Deploy, GetDeployResult], arg: string) {
    const argument = Helper.deployGetArgByName(deploy, arg);
    if (argument && argument.value()) {
      return Buffer.from(argument.value()).toString('hex');
    }
    return '';
  }

  /**
   * Get account hash hex from a transfer
   * @param deploy
   */
  static accountHashHex(deploy: [Deploy, GetDeployResult]) {
    const argument = deploy[0].session.getArgByName('target');
    if (argument && argument.value()) {
      return Buffer.from(argument.value()).toString('hex');
    }
    return '';
  }

  /**
   * Get memo from a transfer
   * @param deploy
   */
  static getId(deploy: [Deploy, GetDeployResult]) {
    const arg = deploy[0].session.getArgByName('id');
    if (arg && arg.value()?.val?.data) {
      return arg.value()?.val?.data.toString();
    }
    return '';
  }

  /**
   * Sleep the process for a given number of milliseconds
   * @param ms
   */
  static sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Promise with timeout
   * @param promise
   * @param ms
   * @param timeoutError
   */
  static promiseWithTimeout<T>(promise: Promise<T>, ms: number, timeoutError = new Error('Promise timed out')): Promise<T> {
    // create a promise that rejects in milliseconds
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(timeoutError);
      }, ms);
    });

    // returns a race between timeout and the passed promise
    return Promise.race<T>([promise, timeout]);
  }
}
