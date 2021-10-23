/**
 * Storage for deploys within a block
 */
interface ConfigType {
  limitBulkInsert?: number,
  baseRandomThrottleNumber?: number,
}

/**
 * Config class
 * limitBulkInsert Used to define the limit of object to insert in one time into the db
 * baseRandomThrottleNumber Used to define the random number added to the throttle of the program.
 * This number will be between 1 and n+1.
 */
export default class Config {
  limitBulkInsert = 10000;

  baseRandomThrottleNumber = 3;

  constructor(options: ConfigType) {
    this.limitBulkInsert = options.limitBulkInsert
      || parseInt(process.env.LIMIT_BULK_INSERT as string, 10)
      || 10000;
    this.baseRandomThrottleNumber = options.baseRandomThrottleNumber
      || parseInt(process.env.BASE_RANDOM_THROTTLE_NUMBER as string, 10)
      || 3;
  }
}
