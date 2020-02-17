/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { DialectContract } from '@ioc:Adonis/Lucid/Database'

export class OracleDialect implements DialectContract {
  public readonly name = 'oracledb'
  public readonly supportsAdvisoryLocks = false

  /**
   * The default format for datetime column. The date formats is
   * valid for luxon date parsing library
   */
  public readonly dateTimeFormat = 'yyyy-MM-dd HH:mm:ss'

  public getAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for oracledb. Create a PR to add the feature')
  }

  public releaseAdvisoryLock (): Promise<boolean> {
    throw new Error('Support for advisory locks is not implemented for oracledb. Create a PR to add the feature')
  }
}
