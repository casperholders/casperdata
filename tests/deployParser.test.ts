import DeployParser from '../src/deployParser';
import Deploys from '../src/services/Deploys';
import {
  CasperClient, CasperServiceByJsonRPC, CLByteArray, CLPublicKey, CLString, CLU8,
  CLValue,
  DeployUtil,
  GetDeployResult,
  RuntimeArgs,
} from 'casper-js-sdk';
import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import Blocks from '../src/services/Blocks';
import BlockParser from '../src/blockParser';
import Config from '../src/Config';

const models = require('../models');

jest.setTimeout(50000);

function randomDeploy(
  session: DeployUtil.ExecutableDeployItem,
  expectedType: string,
  cost?: number,
) {
  return {
    deployHash: 'randomDeployHash',
    blockHash: 'randomBlockHash',
    expectedType,
    deploy: [
      {
        session,
      },
      {
        deploy: {
          hash: 'randomDeployHash',
          header: {
            account: '0182f835993ce0d3596147429ea432b3a025580f458f50bbbaccbbe4c73f1f1113',
            timestamp: '2021-06-16T21:02:33.472Z',
          },
        },
        execution_results: [
          {
            result: {
              Success: {
                cost: cost || 667974020,
              },
            },
          },
        ],
      },
    ] as any as [Deploy, GetDeployResult],
  };
}

function randomDeployContractByHash(
  entrypoint: string,
  expectedType: string,
  versionContractName: boolean,
  contractName: boolean,
  versionContractHash: boolean,
  name?: string,
) {
  let session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    new Uint8Array(),
    entrypoint,
    new RuntimeArgs(new Map<string, CLValue>()),
  );
  if (versionContractHash) {
    session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
      new Uint8Array(),
      null,
      entrypoint,
      new RuntimeArgs(new Map<string, CLValue>()),
    );
  }

  if (versionContractName) {
    session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByName(
      name || '',
      null,
      entrypoint,
      new RuntimeArgs(new Map<string, CLValue>()),
    );
  }

  if (contractName) {
    session = DeployUtil.ExecutableDeployItem.newStoredContractByName(
      name || '',
      entrypoint,
      new RuntimeArgs(new Map<string, CLValue>()),
    );
  }

  return randomDeploy(session, expectedType);
}

function randomDeployModuleBytesContract(expectedType: string, args: string[], cost?: number) {
  const map = new Map<string, CLValue>();
  args.forEach((value) => {
    map.set(value, new CLString('randomValue'));
  });
  const session = DeployUtil.ExecutableDeployItem.newModuleBytes(
    new Uint8Array(),
    new RuntimeArgs(map),
  );
  return randomDeploy(session, expectedType, cost);
}

describe('Test deployParser class', () => {
  beforeAll(async () => {
    await models.sequelize.sync({ force: true });
  });

  it('Should sum', async () => {
    const deploys = new Deploys();
    const casperClient = new CasperClient('http://176.9.125.5:7777/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const res = deployParser.sum(1, 1);
    expect(res).toEqual(2);
  });

  it('Should parse all deploys', async () => {
    const blocks = new Blocks();
    const deploys = new Deploys();
    const casperClient = new CasperClient('http://176.9.125.5:7777/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    const blockParser = new BlockParser(casperClient, new CasperServiceByJsonRPC('http://176.9.125.5:7777/rpc'), deployParser, blocks, deploys, config);
    await blockParser.parseBlock(228359);
    await blocks.bulkCreate();
    await deployParser.parseAllDeploys();
    await deploys.bulkCreate();

    const databaseDeploys = await models.Deploy.findAll();
    expect(databaseDeploys.length).toEqual(732);
  });

  it('Should parse a transfer', async () => {
    const blocks = new Blocks();

    blocks.upsertBlock({
      hash: 'B2013d62225Ad3704dD5Bc0af5fC665fF16E804CcF7B03cF028C86c7185dC984',
      header: {
        era_id: 2629,
        timestamp: '2021-11-14T15:18:12.224Z',
        height: 296409,
      },
    }, false, false);

    await blocks.bulkCreate();

    const deploys = new Deploys();
    const casperClient = new CasperClient('http://176.9.125.5:7777/rpc');
    const config = new Config({});
    const deployParser = new DeployParser(casperClient, deploys, config);
    await deployParser.storeTransfer('8721159C33213d125716947B26772B64AEB61BFc95298Ae0255E626e0698A881', 'B2013d62225Ad3704dD5Bc0af5fC665fF16E804CcF7B03cF028C86c7185dC984');
    await deploys.bulkCreate();

    const databaseDeploys = await models.Deploy.findAll({
      where: {
        hash: '8721159C33213d125716947B26772B64AEB61BFc95298Ae0255E626e0698A881',
      },
    });

    expect(databaseDeploys.length).toEqual(1);
    expect(databaseDeploys[0].hash).toEqual('8721159C33213d125716947B26772B64AEB61BFc95298Ae0255E626e0698A881');
    expect(databaseDeploys[0].from).toEqual('0111bc2070A9Af0F26F94B8549BfFa5643eAd0bc68EBA3b1833039cFa2A9a8205d');
    expect(databaseDeploys[0].cost).toEqual('100000000');
    expect(databaseDeploys[0].result).toEqual(true);
    expect(databaseDeploys[0].timestamp).toEqual(new Date('2021-11-14T15:17:06.000Z'));
    expect(databaseDeploys[0].block).toEqual('B2013d62225Ad3704dD5Bc0af5fC665fF16E804CcF7B03cF028C86c7185dC984');
    expect(databaseDeploys[0].type).toEqual(Deploys.TRANSFER);
    expect(databaseDeploys[0].data).toEqual({
      hash: '8721159C33213d125716947B26772B64AEB61BFc95298Ae0255E626e0698A881',
      amount: '10000000000',
      from: '0111bc2070A9Af0F26F94B8549BfFa5643eAd0bc68EBA3b1833039cFa2A9a8205d',
      target: 'ac916b2479626db496440785d12245c9979cdb01416255cef49a4788d911a6e5',
      id: '1234',
    });
  });

  const dataSet = [
    randomDeployContractByHash('delegate', Deploys.DELEGATE, false, false, false),
    randomDeployContractByHash('undelegate', Deploys.UNDELEGATE, false, false, false),
    randomDeployContractByHash('add_bid', Deploys.ADD_BID, false, false, false),
    randomDeployContractByHash('withdraw_bid', Deploys.WITHDRAW_BID, false, false, false),
    randomDeployContractByHash('set_url', Deploys.ACCOUNT_INFO, false, false, false),
    randomDeployContractByHash('store_signature', Deploys.CASPER_SIGN_CONTRACT, true, false, false, 'caspersign_contract'),
    randomDeployContractByHash('call_faucet', Deploys.FAUCET, false, true, false, 'faucet'),
    randomDeployContractByHash('store_signature', Deploys.UNKNOWN, false, false, false),
    randomDeployContractByHash('call_faucet', Deploys.UNKNOWN, false, false, false),
    randomDeployContractByHash('random', Deploys.UNKNOWN, false, false, true),
    randomDeployModuleBytesContract(Deploys.DELEGATE, ['delegator', 'validator', 'amount']),
    randomDeployModuleBytesContract(Deploys.UNDELEGATE, ['delegator', 'validator', 'amount'], 1),
    randomDeployModuleBytesContract(Deploys.ADD_BID, ['delegation_rate']),
    randomDeployModuleBytesContract(Deploys.WITHDRAW_BID, ['public_key', 'amount']),
    randomDeployModuleBytesContract(Deploys.ACTIVATE_BID, ['validator_public_key']),
    randomDeployModuleBytesContract(Deploys.UNKNOWN, ['validator_public_key', 'randomArg']),
    randomDeployModuleBytesContract(Deploys.KEY_MANAGEMENT, ['action', 'deployment_thereshold', 'key_management_threshold']),
    randomDeployModuleBytesContract(Deploys.KEY_WEIGHT, ['action', 'account', 'weight']),
    randomDeployModuleBytesContract(Deploys.UNKNOWN, ['action', 'account', 'weight', 'randomArg']),
    randomDeployModuleBytesContract(Deploys.KEY_MANAGEMENT_THRESHOLD, ['action', 'weight']),
    randomDeployModuleBytesContract(Deploys.UNKNOWN, ['action', 'weight', 'randomArg']),
    randomDeployModuleBytesContract(Deploys.SIMPLE_TRANSFER, ['target', 'amount']),
    randomDeployModuleBytesContract(Deploys.UNKNOWN, ['target', 'amount', 'randomArg']),
    randomDeployModuleBytesContract(Deploys.ERC20_TOKEN, ['token_name', 'token_symbol']),
    randomDeployModuleBytesContract(Deploys.WASM_DEPLOY, []),
    randomDeployModuleBytesContract(Deploys.UNKNOWN, ['randomArg']),
  ];

  it.each(dataSet)(
    'Should parse a deploy',
    async ({ deployHash, blockHash, expectedType, deploy }) => {
      jest.spyOn(CasperClient.prototype, 'getDeploy').mockImplementation(() => new Promise((resolve) => {
        resolve(deploy);
      }));
      jest.spyOn(DeployUtil.ExecutableDeployItem.prototype, 'getArgByName').mockImplementation((name) => {
        if (['action', 'url', 'amount', 'token_name', 'token_symbol', 'authorized_minter'].indexOf(name) >= 0) {
          return new CLString(name);
        }
        if (['target', 'account'].indexOf(name) >= 0) {
          return new CLByteArray(CLPublicKey.fromHex('0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca').toAccountHash());
        }
        if (['validator_public_key', 'publicKey', 'public_key', 'delegator', 'validator'].indexOf(name) >= 0) {
          return CLPublicKey.fromHex('0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca');
        }
        if (['delegation_rate', 'token_decimals', 'token_total_supply', 'deployment_thereshold', 'key_management_threshold', 'weight'].indexOf(name) >= 0) {
          return new CLU8(0);
        }
        return undefined;
      });
      const deploys = new Deploys();
      const casperClient = new CasperClient('http://176.9.125.5:7777/rpc');
      const config = new Config({});
      const deployParser = new DeployParser(casperClient, deploys, config);
      await deployParser.parseDeploy(deployHash, blockHash);
      expect(deployParser.deploys.data.length).toEqual(1);
      expect(deployParser.deploys.data[0].type).toEqual(expectedType);
      deployParser.deploys.data = [];
      expect(deployParser.deploys.data.length).toEqual(0);
    },
  );
});
