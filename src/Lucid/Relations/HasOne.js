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

/**
 * The HasOne relationship defines a relation between
 * two models
 *
 * @class HasOne
 * @constructor
 */
class HasOne extends BaseRelation {
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
   * Returns an array of values to be used for running
   * whereIn query when eagerloading relationships.
   *
   * @method mapValues
   *
   * @param  {Array}  modelInstances - An array of model instances
   *
   * @return {Array}
   */
  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  /**
   * Takes an array of related instances and returns an array
   * for each parent record.
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
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])
    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  /**
   * Fetch related rows for a relationship
   *
   * @method fetch
   *
   * @alias first
   *
   * @return {Model}
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
   * Saves the related instance to the database. Foreign
   * key is set automatically
   *
   * @method save
   *
   * @param  {Object} relatedInstance
   *
   * @return {Promise}
   */
  save (relatedInstance) {
    relatedInstance[this.foreignKey] = this.$primaryKeyValue
    return relatedInstance.save()
  }

  /**
   * Creates the new related instance model and persist
   * it to database. Foreign key is set automatically
   *
   * @method create
   *
   * @param  {Object} payload
   *
   * @return {Promise}
   */
  create (payload) {
    payload[this.foreignKey] = this.$primaryKeyValue
    return this.relatedModel.create(payload)
  }
}

module.exports = HasOne
