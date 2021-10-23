import Deploys from '../src/services/Deploys';
import {
  CLByteArray,
  CLPublicKey,
  CLString, CLU8,
  CLValue,
  DeployUtil,
  GetDeployResult,
  RuntimeArgs,
} from 'casper-js-sdk';
import Blocks from '../src/services/Blocks';
import AccountInfo from '../src/services/AccountInfo/AccountInfo';
import { Deploy } from 'casper-js-sdk/dist/lib/DeployUtil';
import ActivateBid from '../src/services/Auction/ActivateBid';
import AddBid from '../src/services/Auction/AddBid';
import Delegate from '../src/services/Auction/Delegate';
import Undelegate from '../src/services/Auction/Undelegate';
import WithdrawBid from '../src/services/Auction/WithdrawBid';
import ERC20 from '../src/services/ERC20/ERC20';
import KeyManagement from '../src/services/KeyManagement/KeyManagement';
import KeyManagementThreshold from '../src/services/KeyManagement/KeyManagementThreshold';
import KeyWeight from '../src/services/KeyManagement/KeyWeight';
import SimpleTransfer from '../src/services/Transfer/SimpleTransfer';
import Faucet from '../src/services/Faucet/Faucet';

const models = require('../models');

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

describe('Test deploys class', () => {
  beforeAll(async () => {
    await models.sequelize.sync({ force: true });
  });

  it('should create a deploy', async () => {
    const blocks = new Blocks();

    blocks.upsertBlock({
      hash: 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5',
      header: {
        era_id: 925,
        timestamp: '2021-06-16T21:02:33.472Z',
        height: 100000,
      },
    }, true, false);

    await blocks.bulkCreate();

    const deploys = new Deploys();

    const deploy = [
      {
        session: {},
      },
      {
        deploy: {
          hash: '066e6b608816f03f8a1e7c2870df6f03224081e52cff159aff0c240978c3a63b',
          header: {
            account: '0182f835993ce0d3596147429ea432b3a025580f458f50bbbaccbbe4c73f1f1113',
            timestamp: '2021-06-16T21:02:33.472Z',
          },
        },
        execution_results: [
          {
            result: {
              Success: {
                cost: 667974020,
              },
            },
          },
        ],
      },
    ] as any as [Deploy, GetDeployResult];

    deploys.parseDeployData(deploy, 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5', Deploys.UNKNOWN, {});

    await deploys.bulkCreate();

    const databaseDeploys = await models.Deploy.findAll();

    expect(databaseDeploys.length).toEqual(1);
    expect(databaseDeploys[0].hash).toEqual('066e6b608816f03f8a1e7c2870df6f03224081e52cff159aff0c240978c3a63b');
    expect(databaseDeploys[0].from).toEqual('0182f835993ce0d3596147429ea432b3a025580f458f50bbbaccbbe4c73f1f1113');
    expect(databaseDeploys[0].cost).toEqual('667974020');
    expect(databaseDeploys[0].result).toEqual(true);
    expect(databaseDeploys[0].timestamp).toEqual(new Date('2021-06-16T21:02:33.472Z'));
    expect(databaseDeploys[0].block).toEqual('fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5');
    expect(databaseDeploys[0].type).toEqual(Deploys.UNKNOWN);
    expect(databaseDeploys[0].data).toEqual({});
  });

  const dataSet = [
    {
      deployType: AccountInfo,
      data: { url: 'url' },
    },
    {
      deployType: ActivateBid,
      data: { validator_public_key: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca' },
    },
    {
      deployType: AddBid,
      data: {
        publicKey: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        amount: 'amount',
        delegation_rate: 0,
      },
    },
    {
      deployType: Delegate,
      data: {
        delegator: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        validator: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        amount: 'amount',
      },
    },
    {
      deployType: Undelegate,
      data: {
        delegator: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        validator: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        amount: 'amount',
      },
    },
    {
      deployType: WithdrawBid,
      data: {
        publicKey: '0106ca7c39cd272dbf21a86eeb3b36b7c26e2e9b94af64292419f7862936bca2ca',
        amount: 'amount',
      },
    },
    {
      deployType: ERC20,
      data: {
        token_name: 'token_name',
        token_symbol: 'token_symbol',
        token_decimals: 0,
        token_total_supply: 0,
        authorized_minter: 'authorized_minter',
      },
    },
    {
      deployType: Faucet,
      data: {
        target: 'fa12d2dd5547714f8c2754d418aa8c9d59dc88780350cb4254d622e2d4ef7e69',
        amount: 'amount',
      },
    },
    {
      deployType: KeyManagement,
      data: {
        action: 'action',
        deployment_thereshold: 0,
        key_management_threshold: 0,
      },
    },
    {
      deployType: KeyManagementThreshold,
      data: {
        action: 'action',
        account: 'fa12d2dd5547714f8c2754d418aa8c9d59dc88780350cb4254d622e2d4ef7e69',
        weight: 0,
      },
    },
    {
      deployType: KeyWeight,
      data: {
        action: 'action',
        account: 'fa12d2dd5547714f8c2754d418aa8c9d59dc88780350cb4254d622e2d4ef7e69',
        weight: 0,
      },
    },
    {
      deployType: SimpleTransfer,
      data: {
        amount: 'amount',
        target: 'fa12d2dd5547714f8c2754d418aa8c9d59dc88780350cb4254d622e2d4ef7e69',
      },
    },
  ];

  it.each(dataSet)('should create a deploy', async ({
    deployType,
    data,
  }) => {
    const deploy = [
      {
        session: DeployUtil.ExecutableDeployItem.newModuleBytes(
          new Uint8Array(),
          new RuntimeArgs(new Map<string, CLValue>()),
        ),
      },
      {},
    ] as any as [Deploy, GetDeployResult];

    const res = deployType.parseData(deploy);

    expect(res).toEqual(data);
  });
});
