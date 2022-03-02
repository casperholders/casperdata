import Blocks from '../src/services/Blocks';

const models = require('../models');

describe('Test blocks class', () => {
  beforeAll(async () => {
    await models.sequelize.sync({ force: true });
  });

  it('should create a block', async () => {
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

    const databaseBlocks = await models.Block.findAll();

    expect(databaseBlocks.length).toEqual(1);
    expect(databaseBlocks[0].hash).toEqual('fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5');
    expect(databaseBlocks[0].era).toEqual(925);
    expect(databaseBlocks[0].timestamp).toEqual(new Date('2021-06-16T21:02:33.472Z'));
    expect(databaseBlocks[0].height).toEqual(100000);
    expect(databaseBlocks[0].era_end).toEqual(true);
    expect(databaseBlocks[0].validated).toEqual(false);
  });

  it('shouldn\'t create a block', async () => {
    const blocks = new Blocks();

    blocks.upsertBlock({
      header: {
        era_id: 925,
        timestamp: '2021-06-16T21:02:33.472Z',
        height: 100000,
      },
    }, true, false);
    try {
      await blocks.bulkCreate();
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toEqual('Validation error');
      }
    }
  });

  it('should validate a block', async () => {
    const blocks = new Blocks();

    blocks.upsertBlock({
      hash: 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5',
      header: {
        era_id: 925,
        timestamp: '2021-06-16T21:02:33.472Z',
        height: 100000,
      },
    }, true, false);

    blocks.upsertBlock({
      hash: 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae6',
      header: {
        era_id: 925,
        timestamp: '2021-06-17T21:02:33.472Z',
        height: 100001,
      },
    }, true, false);

    blocks.updateValidateBlock({
      hash: 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5',
      era: 925,
      timestamp: '2021-06-16T21:02:33.472Z',
      height: 100000,
      era_end: true,
    });

    await blocks.bulkCreate();

    let databaseBlocks = await models.Block.findAll({
      order: [
        ['timestamp', 'ASC'],
      ],
    });

    expect(databaseBlocks.length).toEqual(2);
    expect(databaseBlocks[0].hash).toEqual('fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae5');
    expect(databaseBlocks[0].era).toEqual(925);
    expect(databaseBlocks[0].timestamp).toEqual(new Date('2021-06-16T21:02:33.472Z'));
    expect(databaseBlocks[0].height).toEqual(100000);
    expect(databaseBlocks[0].era_end).toEqual(true);
    expect(databaseBlocks[0].validated).toEqual(true);
    expect(databaseBlocks[1].hash).toEqual('fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae6');
    expect(databaseBlocks[1].era).toEqual(925);
    expect(databaseBlocks[1].timestamp).toEqual(new Date('2021-06-17T21:02:33.472Z'));
    expect(databaseBlocks[1].height).toEqual(100001);
    expect(databaseBlocks[1].era_end).toEqual(true);
    expect(databaseBlocks[1].validated).toEqual(false);

    blocks.updateValidateBlock({
      hash: 'fa6b4e1507ac45d48312b1997393285b0a7ecd5963d77d5bbcfd0c076be68ae6',
      era: 925,
      timestamp: '2021-06-17T21:02:33.472Z',
      height: 100001,
      era_end: true,
    });

    await blocks.bulkCreate();

    databaseBlocks = await models.Block.findAll({
      order: [
        ['timestamp', 'ASC'],
      ],
    });

    expect(databaseBlocks.length).toEqual(2);
    expect(databaseBlocks[0].validated).toEqual(true);
    expect(databaseBlocks[1].validated).toEqual(true);
  });
});
