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
import { HasManyThrough } from '@ioc:Adonis/Lucid/Orm'

import { hasManyThrough, column } from '../../src/Orm/Decorators'
import { HasManyThroughQueryBuilder } from '../../src/Orm/Relations/HasManyThrough/QueryBuilder'
import { ormAdapter, getBaseModel, setup, cleanup, resetTables, getDb, getProfiler } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model | Has Many Through | Options', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('raise error when localKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<typeof Post>
      }
      Country.boot()

      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "Country" model, but is missing',
      )
    }
  })

  test('raise error when foreignKey is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "countryId" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when through local key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column()
        public countryId: number
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "id" to exist on "User" model, but is missing',
      )
    }
  })

  test('raise error when through foreign key is missing', (assert) => {
    assert.plan(1)

    try {
      class User extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @column()
        public countryId: number
      }
      User.boot()

      class Post extends BaseModel {
      }
      Post.boot()

      class Country extends BaseModel {
        @column({ isPrimary: true })
        public id: number

        @hasManyThrough([() => Post, () => User])
        public posts: HasManyThrough<typeof Post>
      }

      Country.boot()
      Country.$getRelation('posts')!.boot()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_MISSING_MODEL_ATTRIBUTE: "Country.posts" expects "userId" to exist on "Post" model, but is missing',
      )
    }
  })

  test('compute all required keys', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')!
    relation.boot()

    assert.equal(relation['localKey'], 'id')
    assert.equal(relation['localKeyColumnName'], 'id')

    assert.equal(relation['foreignKey'], 'countryId')
    assert.equal(relation['foreignKeyColumnName'], 'country_id')

    assert.equal(relation['throughLocalKey'], 'id')
    assert.equal(relation['throughLocalKeyColumnName'], 'id')

    assert.equal(relation['throughForeignKey'], 'userId')
    assert.equal(relation['throughForeignKeyColumnName'], 'user_id')
  })

  test('compute custom keys', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public uid: number

      @column()
      public countryUid: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userUid: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public uid: number

      @hasManyThrough([() => Post, () => User], {
        throughForeignKey: 'userUid',
        throughLocalKey: 'uid',
        foreignKey: 'countryUid',
        localKey: 'uid',
      })
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()

    const relation = Country.$getRelation('posts')!
    relation.boot()

    assert.equal(relation['localKey'], 'uid')
    assert.equal(relation['localKeyColumnName'], 'uid')

    assert.equal(relation['foreignKey'], 'countryUid')
    assert.equal(relation['foreignKeyColumnName'], 'country_uid')

    assert.equal(relation['throughLocalKey'], 'uid')
    assert.equal(relation['throughLocalKeyColumnName'], 'uid')

    assert.equal(relation['throughForeignKey'], 'userUid')
    assert.equal(relation['throughForeignKeyColumnName'], 'user_uid')
  })
})

test.group('Model | Has Many Through | Set Relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  test('set related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const country = new Country()
    const post = new Post()

    Country.$getRelation('posts')!.setRelated(country, [post])
    assert.deepEqual(country.posts, [post])
  })

  test('push related model instance', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const country = new Country()
    const post = new Post()
    const post1 = new Post()

    Country.$getRelation('posts')!.setRelated(country, [post])
    Country.$getRelation('posts')!.pushRelated(country, [post1])
    assert.deepEqual(country.posts, [post, post1])
  })

  test('set many of related instances', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    Country.$getRelation('posts')!.boot()

    const country = new Country()
    country.fill({ id: 1 })

    const country1 = new Country()
    country1.fill({ id: 2 })

    const country2 = new Country()
    country2.fill({ id: 3 })

    const post = new Post()
    post.fill({ userId: 1 })
    post.$extras = {
      through_country_id: 1,
    }

    const post1 = new Post()
    post1.fill({ userId: 2 })
    post1.$extras = {
      through_country_id: 2,
    }

    const post2 = new Post()
    post2.fill({ userId: 3 })
    post2.$extras = {
      through_country_id: 1,
    }

    Country.$getRelation('posts')!.setRelatedForMany([country, country1, country2], [post, post1, post2])
    assert.deepEqual(country.posts, [post, post2])
    assert.deepEqual(country1.posts, [post1])
    assert.deepEqual(country2.posts, [] as any)
  })
})

test.group('Model | Has Many Through | bulk operations', (group) => {
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

  test('generate correct sql for selecting related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .where('users.country_id', 1)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for selecting many related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').multiInsert([
      { name: 'India' },
      { name: 'UK' },
    ])

    const countries = await Country.all()
    Country.$getRelation('posts')!.boot()

    const query = Country.$getRelation('posts')!.eagerQuery(countries, db.connection())
    const { sql, bindings } = query.toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .select('posts.*', 'users.country_id as through_country_id')
      .innerJoin('users', 'users.id', 'posts.user_id')
      .whereIn('users.country_id', [2, 1])
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for updating related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const now = new Date()

    const { sql, bindings } = country!.related('posts').query().update({
      updated_at: now,
    }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .update({ updated_at: now })
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('generate correct sql for deleting related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })

    const country = await Country.find(1)
    const { sql, bindings } = country!.related('posts').query().del().toSQL()

    const { sql: knexSql, bindings: knexBindings } = db.connection()
      .getWriteClient()
      .from('posts')
      .del()
      .whereIn('posts.user_id', (builder) => {
        builder.from('users').where('users.country_id', 1)
      })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Model | Has Many Through | aggregates', (group) => {
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

  test('get total of all related rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })
    await db.table('users').insert({
      username: 'virk',
      country_id: 1,
    })

    await db.table('posts').multiInsert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 1,
        title: 'Lucid 101',
      },
      {
        user_id: 2,
        title: 'Profiler 101',
      },
    ])

    const country = await Country.find(1)
    const total = await country!.related('posts').query().count('* as total')
    assert.deepEqual(Number(total[0].total), 2)
  })

  test('select extra columns with count', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }

    Country.boot()
    await db.table('countries').insert({ name: 'India' })
    await db.table('users').insert({
      username: 'virk',
      country_id: 1,
    })

    await db.table('posts').multiInsert([
      {
        user_id: 1,
        title: 'Adonis 101',
      },
      {
        user_id: 1,
        title: 'Lucid 101',
      },
      {
        user_id: 2,
        title: 'Profiler 101',
      },
    ])

    const country = await Country.find(1)
    const total = await country!
      .related('posts')
      .query()
      .select('title')
      .groupBy('posts.title')
      .count('* as total')

    assert.lengthOf(total, 2)
    assert.deepEqual(Number(total[0].total), 1)
    assert.equal(total[0].title, 'Adonis 101')
    assert.deepEqual(Number(total[0].total), 1)
    assert.equal(total[1].title, 'Lucid 101')
  })
})

test.group('Model | Has Many Through | preload', (group) => {
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

  test('preload through relationships', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 1 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 1)
    assert.lengthOf(countries[0].posts, 3)
    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[2].title, 'Adonis5')
    assert.equal(countries[0].posts[2].$extras.through_country_id, 1)
  })

  test('preload many relationships', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts')
    assert.lengthOf(countries, 2)
    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('preload many relationships using model instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().orderBy('id', 'asc')
    assert.lengthOf(countries, 2)

    await countries[0].preload('posts')
    await countries[1].preload('posts')

    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.equal(countries[0].posts[0].$extras.through_country_id, 1)

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.equal(countries[0].posts[1].$extras.through_country_id, 1)

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.equal(countries[1].posts[0].$extras.through_country_id, 2)
  })

  test('cherry pick columns during preload', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const countries = await Country.query().preload('posts', (builder) => {
      builder.select('title')
    })

    assert.lengthOf(countries, 2)
    assert.lengthOf(countries[0].posts, 2)
    assert.lengthOf(countries[1].posts, 1)

    assert.equal(countries[0].posts[0].title, 'Adonis 101')
    assert.deepEqual(countries[0].posts[0].$extras, { through_country_id: 1 })

    assert.equal(countries[0].posts[1].title, 'Lucid 101')
    assert.deepEqual(countries[0].posts[1].$extras, { through_country_id: 1 })

    assert.equal(countries[1].posts[0].title, 'Adonis5')
    assert.deepEqual(countries[1].posts[0].$extras, { through_country_id: 2 })
  })

  test('raise error when local key is not selected', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }, { name: 'USA' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 2 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    try {
      await Country.query().select('name').preload('posts')
    } catch ({ message }) {
      assert.equal(message, 'Cannot preload "posts", value of "Country.id" is undefined')
    }
  })

  test('pass relationship metadata to the profiler', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.insertQuery().table('countries').insert([{ name: 'India' }])

    await db.insertQuery().table('users').insert([
      { username: 'virk', country_id: 1 },
      { username: 'nikk', country_id: 1 },
    ])

    await db.insertQuery().table('posts').insert([
      { title: 'Adonis 101', user_id: 1 },
      { title: 'Lucid 101', user_id: 1 },
      { title: 'Adonis5', user_id: 2 },
    ])

    const profiler = getProfiler(true)

    let profilerPacketIndex = 0
    profiler.process((packet) => {
      if (profilerPacketIndex === 1) {
        assert.deepEqual(packet.data.relation, {
          model: 'Country',
          relatedModel: 'Post',
          throughModel: 'User',
          relation: 'hasManyThrough',
        })
      }
      profilerPacketIndex++
    })

    await Country.query({ profiler }).preload('posts')
  })

  test('do not run preload query when parent rows are empty', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public title: string
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    const countries = await Country.query().preload('posts', () => {
      throw new Error('not expected to be here')
    })
    assert.lengthOf(countries, 0)
  })
})

test.group('Model | Has Many Through | pagination', (group) => {
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

  test('paginate using related model query builder instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.find(1)
    const posts = await country!.related('posts').query().paginate(1, 2)
    posts.baseUrl('/posts')

    assert.lengthOf(posts.all(), 2)
    assert.instanceOf(posts.all()[0], Post)
    assert.notProperty(posts.all()[0].$extras, 'total')
    assert.equal(posts.perPage, 2)
    assert.equal(posts.currentPage, 1)
    assert.equal(posts.lastPage, 2)
    assert.isTrue(posts.hasPages)
    assert.isTrue(posts.hasMorePages)
    assert.isFalse(posts.isEmpty)
    assert.equal(posts.total, 3)
    assert.isTrue(posts.hasTotal)
    assert.deepEqual(posts.getMeta(), {
      total: 3,
      per_page: 2,
      current_page: 1,
      last_page: 2,
      first_page: 1,
      first_page_url: '/posts?page=1',
      last_page_url: '/posts?page=2',
      next_page_url: '/posts?page=2',
      previous_page_url: null,
    })
  })

  test('disallow paginate during preload', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').insert({ name: 'India' })

    try {
      await Country.query().preload('posts', (query) => query.paginate(1))
    } catch ({ message }) {
      assert.equal(message, 'Cannot paginate relationship "posts" during preload')
    }
  })
})

test.group('Model | Has Many Through | clone', (group) => {
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

  test('clone related model query builder', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.find(1)
    const clonedQuery = country!.related('posts').query().clone()
    assert.instanceOf(clonedQuery, HasManyThroughQueryBuilder)
  })
})

test.group('Model | Has Many Through | scopes', (group) => {
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

  test('apply scopes during eagerload', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string

      public static adonisOnly = Post.defineScope((query) => {
        query.where('title', 'Adonis 101')
      })
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.query().where('id', 1).preload('posts', (query) => {
      query.apply((scopes) => scopes.adonisOnly())
    }).firstOrFail()

    const countryWithoutScope = await Country.query().where('id', 1).preload('posts').firstOrFail()

    assert.lengthOf(country.posts, 1)
    assert.lengthOf(countryWithoutScope.posts, 3)
    assert.equal(country.posts[0].title, 'Adonis 101')
  })

  test('apply scopes on related query', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public countryId: number
    }
    User.boot()

    class Post extends BaseModel {
      @column()
      public userId: number

      @column()
      public title: string

      public static adonisOnly = Post.defineScope((query) => {
        query.where('title', 'Adonis 101')
      })
    }
    Post.boot()

    class Country extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasManyThrough([() => Post, () => User])
      public posts: HasManyThrough<typeof Post>
    }
    Country.boot()

    await db.table('countries').multiInsert([{ name: 'India' }, { name: 'Switzerland' }])
    await db.table('users').multiInsert([
      {
        username: 'virk',
        country_id: 1,
      },
      {
        username: 'nikk',
        country_id: 1,
      },
      {
        username: 'romain',
        country_id: 2,
      },
    ])

    await db.table('posts').multiInsert([
      {
        title: 'Adonis 101',
        user_id: 1,
      },
      {
        title: 'Lucid 101',
        user_id: 1,
      },
      {
        title: 'Design 101',
        user_id: 2,
      },
      {
        title: 'Dev 101',
        user_id: 3,
      },
    ])

    const country = await Country.findOrFail(1)
    const posts = await country.related('posts').query().apply((scopes) => scopes.adonisOnly())
    const postsWithoutScope = await country.related('posts').query()

    assert.lengthOf(posts, 1)
    assert.lengthOf(postsWithoutScope, 3)
    assert.equal(posts[0].title, 'Adonis 101')
  })
})
