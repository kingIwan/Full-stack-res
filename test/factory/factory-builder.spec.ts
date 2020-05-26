/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { column } from '../../src/Orm/Decorators'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  getFactoryModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>
const FactoryModel = getFactoryModel()

test.group('Factory | Factory Builder | make', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('apply factory model state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points = 10)
      .build()

    const user = await factory.apply('withPoints').make()
    assert.equal(user.points, 10)
    assert.isFalse(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => {
        user.points += 10
      })
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').make()
    assert.equal(user.points, 10)
    assert.isFalse(user.$isPersisted)
  })

  test('merge custom attributes', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const user = await factory.merge({ username: 'nikk' }).make()
    assert.equal(user.username, 'nikk')
    assert.isFalse(user.$isPersisted)
  })

  test('define custom merge function', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    })
      .merge(() => {})
      .build()

    const user = await factory.merge({ username: 'nikk' }).make()
    assert.equal(user.username, 'virk')
    assert.isFalse(user.$isPersisted)
  })

  test('define custom newUp function', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    })
      .newUp((attributes) => {
        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.make()
    assert.equal(user.username, 'virk')
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('use 0 index elements when attributes are defined as an array', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).make()
    assert.equal(user.username, 'nikk')
    assert.isFalse(user.$isPersisted)
  })
})

test.group('Factory | Factory Builder | makeMany', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('apply factory model state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points = 10)
      .build()

    const users = await factory.apply('withPoints').makeMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points += 10)
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').makeMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const users = await factory.merge({ username: 'nikk' }).makeMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.isFalse(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const users = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).makeMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isFalse(users[1].$isPersisted)
  })
})

test.group('Factory | Factory Builder | create', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('apply factory model state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points = 10)
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points += 10)
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const user = await factory.merge({ username: 'nikk' }).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })

  test('use index 0 elements when attributes are defined as an array', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })
})

test.group('Factory | Factory Builder | createMany', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('apply factory model state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points = 10)
      .build()

    const users = await factory.apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const factory = new FactoryModel(User, () => {
      return {}
    })
      .state('withPoints', (user) => user.points += 10)
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: `u-${new Date().getTime()}`,
        points: 0,
      }
    }).build()

    const users = await factory.merge({ points: 10 }).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number
    }

    const factory = new FactoryModel(User, () => {
      return {
        username: 'virk',
      }
    }).build()

    const users = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isTrue(users[1].$isPersisted)
  })
})
