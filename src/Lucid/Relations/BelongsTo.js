'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')

/**
 * The BelongsTo relationship defines a relation between
 * two models
 *
 * @class BelongsTo
 * @constructor
 */
class BelongsTo extends BaseRelation {
  /**
   * Load a single relationship from parent to child
   * model, but only for one row.
   *
   * @method load
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   */
  load () {
    return this.relatedQuery.where(this.foreignKey, this.$primaryKeyValue).first()
  }

  /**
   * Map values from model instances to an array. It is required
   * to make `whereIn` query when eagerloading results.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Groups related instances with their foriegn keys
   *
   * @method group
   *
   * @param  {Array} relatedInstances
   *
   * @return {Object} @multiple([key=String, values=Array, defaultValue=Null])
   */
  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Overriding fetch to call first, since belongsTo
   * can never have many rows
   *
   * @method fetch
   *
   * @return {Object}
   */
  fetch () {
    return this.first()
  }

  /**
   * Adds a where clause to limit the select search
   * to related rows only.
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foriegnTable}.${this.foreignKey}`)
    if (count) {
      this.relatedQuery.count('*')
    }
    return this.relatedQuery.query
  }

  /**
   * DO NOT DOCUMENT
   */
  create () {
    throw CE.ModelRelationException.unSupportedMethod('create', 'belongsTo')
  }

  /**
   * DO NOT DOCUMENT
   */
  save () {
    throw CE.ModelRelationException.unSupportedMethod('save', 'belongsTo')
  }

  /**
   * DO NOT DOCUMENT
   */
  createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', 'belongsTo')
  }

  /**
   * DO NOT DOCUMENT
   */
  saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', 'belongsTo')
  }

  /**
   * Associate 2 models together, also this method will save
   * the related model if not already persisted
   *
   * @method associate
   *
   * @param  {Object}  relatedInstance
   *
   * @return {Promise}
   */
  async associate (relatedInstance) {
    if (relatedInstance.isNew) {
      await relatedInstance.save()
    }

    this.parentInstance[this.primaryKey] = relatedInstance[this.foreignKey]
    return this.parentInstance.save()
  }

  /**
   * Dissociate relationship from database by setting `foriegnKey` to null
   *
   * @method dissociate
   *
   * @return {Promise}
   */
  async dissociate () {
    if (this.parentInstance.isNew) {
      throw CE.ModelRelationException.unsavedModelInstance('Cannot dissociate relationship since model instance is not persisted')
    }

    this.parentInstance[this.primaryKey] = null
    return this.parentInstance.save()
  }
}

module.exports = BelongsTo
