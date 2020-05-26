/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { FactoryContextContract } from '@ioc:Adonis/Lucid/Factory'
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

export class FactoryContext implements FactoryContextContract {
  public faker = {
    lorem: {
      sentence (_?: number): string {
        return ''
      },
    },
    internet: {
      password () {
        return ''
      },
    },
  }

  public sequence = {
    username: 'string',
    email: 'string',
  }

  constructor (
    public isStubbed: boolean,
    public $trx: TransactionClientContract | undefined
  ) {
  }
}
