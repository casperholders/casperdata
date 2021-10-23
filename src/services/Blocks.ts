const models = require('../../models');

export default class Blocks {
  data: {
    hash: any;
    era: any;
    timestamp: any;
    height: any;
    era_end: boolean;
    validated: boolean;
  }[] = [];

  upsertBlock(block: any, eraEnd: boolean, validated: boolean) {
    this.data.push({
      hash: block.hash,
      era: block.header.era_id,
      timestamp: block.header.timestamp,
      height: block.header.height,
      era_end: eraEnd,
      validated,
    });
  }

  updateValidateBlock(block: any) {
    this.data.push({
      hash: block.hash,
      era: block.era,
      timestamp: block.timestamp,
      height: block.height,
      era_end: block.era_end,
      validated: true,
    });
  }

  async bulkCreate() {
    await models.Block.bulkCreate(this.data, {
      fields: ['hash', 'era', 'timestamp', 'height', 'era_end', 'validated'],
      updateOnDuplicate: ['era', 'timestamp', 'height', 'era_end', 'validated'],
    });
    this.data.length = 0;
  }
}
