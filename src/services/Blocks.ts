const models = require('../../models');

type BlockType = {
  hash: any
  era: any
  timestamp: any
  height: any
  era_end: boolean
  validated: boolean
};

/**
 * Blocks class
 */
export default class Blocks {
  /**
   * Data object, serve as a storage will parsing
   */

  data: Map<string, BlockType> = new Map<string, BlockType>();

  /**
   * Parse a deploy and insert it in the data object
   * @param block
   * @param eraEnd
   * @param validated
   */
  upsertBlock(block: any, eraEnd: boolean, validated: boolean) {
    this.data.set(block.hash, {
      hash: block.hash,
      era: block.header.era_id,
      timestamp: block.header.timestamp,
      height: block.header.height,
      era_end: eraEnd,
      validated,
    });
  }

  /**
   * Update a block to a validated state
   * @param block
   */
  updateValidateBlock(block: any) {
    this.data.set(block.hash, {
      hash: block.hash,
      era: block.era,
      timestamp: block.timestamp,
      height: block.height,
      era_end: block.era_end,
      validated: true,
    });
  }

  /**
   * Bulk inset or update blocks contained in the data object
   */
  async bulkCreate() {
    await models.Block.bulkCreate(Array.from(this.data.values()), {
      fields: ['hash', 'era', 'timestamp', 'height', 'era_end', 'validated'],
      updateOnDuplicate: ['era', 'timestamp', 'height', 'era_end', 'validated'],
    });
    this.data.clear();
  }
}
