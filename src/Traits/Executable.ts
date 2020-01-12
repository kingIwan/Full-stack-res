/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import knex from 'knex'
import { Exception } from '@poppinss/utils'
import { ProfilerActionContract } from '@ioc:Adonis/Core/Profiler'

import {
  QueryClientContract,
  TransactionClientContract,
  ExcutableQueryBuilderContract,
} from '@ioc:Adonis/Lucid/Database'

/**
 * Enforcing constructor on the destination class
 */
export type ExecutableConstructor<T = {
  client: QueryClientContract,
  beforeExecute?: () => Promise<void>,
  getQueryClient: () => undefined | knex,
  $knexBuilder: knex.Raw | knex.QueryBuilder,
  afterExecute?: (results: any[]) => Promise<any[]>,
  getProfilerAction (): ProfilerActionContract | null,
}> = { new (...args: any[]): T }

/**
 * To be used as a trait for executing a query that has a public
 * `$knexBuilder`
 */
export class Executable implements ExcutableQueryBuilderContract<any> {
  protected client: QueryClientContract
  protected beforeExecute?: () => Promise<void>
  protected getQueryClient: () => undefined | knex
  protected $knexBuilder: knex.QueryBuilder | knex.Raw
  protected afterExecute?: (results: any[]) => Promise<any[]>
  protected getProfilerAction: () => ProfilerActionContract | null

  /**
   * Ends the profile action
   */
  private endProfilerAction (action: null | ProfilerActionContract, error?: any) {
    if (!action) {
      return
    }

    error ? action.end({ error }) : action.end()
  }

  /**
   * Executes the knex query builder
   */
  private async executeQuery () {
    const action = this.getProfilerAction()

    try {
      const result = await this.$knexBuilder
      this.endProfilerAction(action)
      return result
    } catch (error) {
      this.endProfilerAction(action, error)
      throw error
    }
  }

  /**
   * Executes the query by acquiring a connection from a custom
   * knex client
   */
  private async executeQueryWithCustomConnection (knexClient: knex) {
    const action = this.getProfilerAction()

    /**
     * Acquire connection from the client and set it as the
     * connection to be used for executing the query
     */
    const connection = await knexClient['acquireConnection']()
    this.$knexBuilder.connection(connection)

    let queryError: any = null
    let queryResult: any = null

    /**
     * Executing the query and catching exceptions so that we can
     * dispose the connection before raising exception from this
     * method
     */
    try {
      queryResult = await this.$knexBuilder
      this.endProfilerAction(action)
    } catch (error) {
      queryError = error
      this.endProfilerAction(action, error)
    }

    /**
     * Releasing the connection back to pool
     */
    knexClient['releaseConnection'](connection)

    /**
     * Re-throw if there was an exception
     */
    if (queryError) {
      throw queryError
    }

    /**
     * Return result
     */
    return queryResult
  }

  /**
   * Turn on/off debugging for this query
   */
  public debug (debug: boolean): this {
    this.$knexBuilder.debug(debug)
    return this
  }

  /**
   * Define query timeout
   */
  public timeout (time: number, options?: { cancel: boolean }): this {
    this.$knexBuilder['timeout'](time, options)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  public toQuery (): string {
    return this.$knexBuilder.toQuery()
  }

  /**
   * Run query inside the given transaction
   */
  public useTransaction (transaction: TransactionClientContract) {
    this.$knexBuilder.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  public async exec (): Promise<any> {
    let result: any

    /**
     * Raise exception when client is missing, since we need one to execute
     * the query
     */
    if (!this.client) {
      throw new Exception('Cannot execute query without query client', 500, 'E_RUNTIME_EXCEPTION')
    }

    /**
     * Execute before handler if exists
     */
    if (typeof (this.beforeExecute) === 'function') {
      await this.beforeExecute()
    }

    /**
     * Execute the query as it is when using `sqlite3` or query builder is part of a
     * transaction
     */
    if (
      this.client.dialect.name === 'sqlite3'
      || this.client.isTransaction
      || this.$knexBuilder['client'].transacting
    ) {
      result = await this.executeQuery()
    } else {
      const knexClient = this.getQueryClient()
      if (knexClient) {
        result = await this.executeQueryWithCustomConnection(knexClient)
      } else {
        result = await this.executeQuery()
      }
    }

    /**
     * Execute after handler if exists
     */
    if (typeof (this.afterExecute) === 'function') {
      result = await this.afterExecute(result)
    }

    return result
  }

  /**
   * Get sql representation of the query
   */
  public toSQL (): knex.Sql {
    return this.$knexBuilder.toSQL()
  }

  /**
   * Implementation of `then` for the promise API
   */
  public then (resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  public catch (reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  public finally (fullfilled: any) {
    return this.exec().finally(fullfilled)
  }

  /**
   * Required when Promises are extended
   */
  public get [Symbol.toStringTag] () {
    return this.constructor.name
  }
}
