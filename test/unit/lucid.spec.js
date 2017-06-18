'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const CollectionSerializer = require('../../src/Lucid/Serializers/Collection')

test.group('Model', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createTables(ioc.use('Adonis/Src/Database'))
  })

  group.beforeEach(() => {
    Model.hydrate()
  })

  group.afterEach(async () => {
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('my_users').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    await fs.remove(path.join(__dirname, './tmp'))
  })

  test('run queries using query builder', (assert) => {
    class User extends Model {}
    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "users"'))
  })

  test('define different table for a model', (assert) => {
    class User extends Model {
      static get table () {
        return 'my_users'
      }
    }

    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "my_users"'))
  })

  test('define table prefix for a model', (assert) => {
    class User extends Model {
      static get prefix () {
        return 'my_'
      }
    }

    const query = User.query().toSQL()
    assert.equal(query.sql, helpers.formatQuery('select * from "my_users"'))
  })

  test('call the boot method only once', (assert) => {
    let callCounts = 0
    class User extends Model {
      static boot () {
        super.boot()
        callCounts++
      }
    }

    User._bootIfNotBooted()
    User._bootIfNotBooted()
    assert.equal(callCounts, 1)
  })

  test('should be able to define model attributes on model instance', (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
  })

  test('remove existing attributes when calling fill', (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    user.fill({ username: 'virk' })
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('call setters when defining attributes via fill', (assert) => {
    class User extends Model {
      setUsername (username) {
        return username.toUpperCase()
      }
    }

    const user = new User()
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'VIRK', age: 22 })
  })

  test('call setters when defining attributes manually', (assert) => {
    class User extends Model {
      setUsername (username) {
        return username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'
    assert.deepEqual(user.$attributes, { username: 'VIRK' })
  })

  test('save attributes to the database and update model state', async (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.isNew)
  })

  test('return proper primary key value using primaryKeyValue getter', async (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.equal(user.primaryKeyValue, 1)
  })

  test('define different primary key for a given model', async (assert) => {
    class User extends Model {
      static get primaryKey () {
        return 'uuid'
      }

      static get table () {
        return 'my_users'
      }

      static get incrementing () {
        return false
      }
    }

    const user = new User()
    user.username = 'virk'
    user.uuid = 112000
    await user.save()

    assert.equal(user.primaryKeyValue, 112000)
    assert.equal(user.primaryKeyValue, user.$attributes.uuid)
  })

  test('add hook for a given type', async (assert) => {
    class User extends Model {
    }

    User.addHook('beforeCreate', function () {})
    User.addHook('afterCreate', function () {})

    assert.lengthOf(User.$hooks.before._handlers.create, 1)
    assert.lengthOf(User.$hooks.after._handlers.create, 1)
  })

  test('throw exception when hook cycle is invalid', async (assert) => {
    class User extends Model {
    }
    const fn = () => User.addHook('orCreate', function () {
    })
    assert.throw(fn, 'E_INVALID_PARAMETER: Invalid hook event {orCreate}')
  })

  test('call before and after create hooks when saving the model for first time', async (assert) => {
    class User extends Model {
    }

    const stack = []
    User.addHook('beforeCreate', function () {
      stack.push('before')
    })

    User.addHook('afterCreate', function () {
      stack.push('after')
    })

    const user = new User()
    await user.save()
    assert.deepEqual(stack, ['before', 'after'])
  })

  test('abort insert if before create throws an exception', async (assert) => {
    assert.plan(2)
    class User extends Model {
    }

    User.addHook('beforeCreate', function () {
      throw new Error('Something bad happened')
    })

    User.addHook('afterCreate', function () {
      stack.push('after')
    })

    const user = new User()
    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(message, 'Something bad happened')
      const users = await ioc.use('Adonis/Src/Database').table('users')
      assert.lengthOf(users, 0)
    }
  })

  test('update model when already persisted', async (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    user.username = 'nikk'
    await user.save()
    const users = await ioc.use('Adonis/Src/Database').table('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, user.$attributes.username)
    assert.equal(users[0].id, user.primaryKeyValue)
  })

  test('only update when there are dirty values', async (assert) => {
    class User extends Model {
    }

    const queries = []
    User.onQuery((query) => queries.push(query))

    const user = new User()
    user.username = 'virk'
    await user.save()
    await user.save()

    assert.lengthOf(queries, 1)
    assert.equal(queries[0].sql, helpers.formatQuery('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)'))
  })

  test('update model for multiple times', async (assert) => {
    class User extends Model {
    }

    const queries = []
    User.onQuery((query) => queries.push(query))

    const user = new User()
    user.username = 'virk'
    await user.save()
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()

    assert.lengthOf(queries, 3)
    assert.equal(queries[0].sql, helpers.formatQuery('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)'))
    assert.equal(queries[1].sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
    assert.deepEqual(queries[1].bindings[1], 'nikk')
    assert.equal(queries[2].sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
    assert.deepEqual(queries[2].bindings[1], 'virk')
    assert.deepEqual(user.dirty, {})
  })

  test('set timestamps automatically', async (assert) => {
    class User extends Model {
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isDefined(user.$attributes.created_at)
    assert.isDefined(user.$attributes.updated_at)
  })

  test('do not set timestamps when columns are not defined', async (assert) => {
    class User extends Model {
      static get createdAtColumn () {
        return null
      }
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.isUndefined(user.$attributes.created_at)
    assert.isDefined(user.$attributes.updated_at)
  })

  test('return serializer instance when calling fetch', async (assert) => {
    class User extends Model {
    }
    await ioc.use('Adonis/Src/Database').insert({ username: 'virk' }).into('users')
    const users = await User.query().fetch()
    assert.instanceOf(users, CollectionSerializer)
  })

  test('cast all dates to moment objects after fetch', async (assert) => {
    class User extends Model {
    }
    const user = new User()
    user.username = 'virk'
    await user.save()

    const users = await User.query().fetch()
    assert.instanceOf(users.first().$attributes.created_at, moment)
  })

  test('collection toJSON should call model toJSON and getters', async (assert) => {
    class User extends Model {
      getCreatedAt (date) {
        return date.fromNow()
      }
    }
    const user = new User()
    user.username = 'virk'
    await user.save()

    const users = await User.query().fetch()
    const json = users.toJSON()
    assert.equal(json[0].created_at, 'a few seconds ago')
  })

  test('update model over insert when fetched from database', async (assert) => {
    class User extends Model {
    }

    let userQuery = null
    User.onQuery(function (query) {
      userQuery = query
    })

    await ioc.use('Adonis/Src/Database').table('users').insert({ username: 'virk' })
    const users = await User.query().fetch()
    const user = users.first()
    user.username = 'nikk'
    await user.save()
    assert.equal(userQuery.sql, helpers.formatQuery('update "users" set "updated_at" = ?, "username" = ?'))
  })

  test('format dates when saving model', async (assert) => {
    class User extends Model {
      static get dates () {
        const dates = super.dates
        dates.push('login_at')
        return dates
      }

      static get dateFormat () {
        return 'DD'
      }
    }

    const user = new User()
    user.username = 'nikk'
    user.login_at = new Date()
    await user.save()
    const freshUser = await ioc.use('Adonis/Src/Database').table('users').first()
    assert.equal(freshUser.login_at, new Date().getDate())
  })

  test('call update hooks when updating model', async (assert) => {
    const stack = []
    class User extends Model {
      static boot () {
        super.boot()
        this.addHook('beforeUpdate', function () {
          stack.push('before')
        })

        this.addHook('afterUpdate', function () {
          stack.push('after')
        })
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, ['before', 'after'])
  })

  test('call save hooks when updating or creating model', async (assert) => {
    const stack = []
    class User extends Model {
      static boot () {
        super.boot()
        this.addHook('beforeSave', function (model) {
          stack.push(`before:${model.$persisted}`)
        })

        this.addHook('afterSave', function () {
          stack.push('after')
        })
      }
    }

    User._bootIfNotBooted()
    const user = new User()
    user.username = 'nikk'
    await user.save()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, ['before:false', 'after', 'before:true', 'after'])
  })

  test('update updated_at timestamp for mass updates', async (assert) => {
    class User extends Model {
      static get dates () {
        const dates = super.dates
        dates.push('login_at')
        return dates
      }

      static get dateFormat () {
        return 'DD'
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Adonis/Src/Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
    await User.query().where('username', 'virk').update({ login_at: new Date() })
    const users = await ioc.use('Adonis/Src/Database').table('users')
    assert.equal(users[0].login_at, new Date().getDate())
  })

  test('attach computed properties to the final output', async (assert) => {
    class User extends Model {
      static get computed () {
        return ['full_name']
      }

      getFullName ({ username }) {
        return `Mr. ${username}`
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Adonis/Src/Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.equal(users.first().toJSON().full_name, 'Mr. virk')
  })

  test('only pick visible fields', async (assert) => {
    class User extends Model {
      static get visible () {
        return ['created_at']
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Adonis/Src/Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.deepEqual(Object.keys(users.first().toJSON()), ['created_at'])
  })

  test('omit hidden fields', async (assert) => {
    class User extends Model {
      static get hidden () {
        return ['created_at']
      }
    }

    User._bootIfNotBooted()
    await ioc.use('Adonis/Src/Database').table('users').insert([{username: 'virk'}, { username: 'nikk' }])
    const users = await User.query().where('username', 'virk').fetch()
    assert.deepEqual(Object.keys(users.first().toJSON()), ['id', 'username', 'updated_at', 'login_at'])
  })
})
