import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'
import { enableExperimentalFragmentVariables } from 'graphql-tag'
import { ApolloConsumer } from 'react-apollo'
import equals from 'shallowequal'

import { QueryContext, QueryContextPropType } from './Query'

import {
  getFragmentName,
  getFragmentNames,
  prefixFragmentArguments,
  extractFragmentArguments,
  getRequestedFragmentNames,
  unique
} from './utils'

// @see: https://github.com/apollographql/graphql-tag/pull/167
if (enableExperimentalFragmentVariables) {
  enableExperimentalFragmentVariables()
}

export const ERRORS = {
  NO_PARENT_QUERY: new Error('Fragment component must belong to a parent Query or Mutation component'),
  NO_FRAGMENT_PROP: new Error('Fragment component must be given a fragment prop'),
}

class QueryFragment extends PureComponent {
  static propTypes = {
    // Injected:
    client: PropTypes.object,
    queryContexts: PropTypes.arrayOf(QueryContextPropType).isRequired,

    // Required:
    fragment: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,

    // Optional:
    id: PropTypes.string,
    variables: PropTypes.object,
    fetchPolicy: PropTypes.string,
  }

  static defaultProps = {
    fetchPolicy: 'cache-first'
  }

  constructor (...args) {
    super(...args)

    this.arguments = []
    this.argumentsNamesMap = {}

    this.fragment = this.props.fragment
    this.fragmentName = getFragmentName(this.fragment)

    // Normalize fragment arguments definition.
    this.fragment = prefixFragmentArguments(this.fragment, this.argumentsNamesMap)
    this.fragment = extractFragmentArguments(this.fragment, this.arguments)

    // Ensure minimal props.
    if (!this.fragment) throw ERRORS.NO_FRAGMENT_PROP

    const fragmentNames = getRequestedFragmentNames(this.fragment).filter(unique)

    this.fragments = []
    this.fragmentNames = [].concat(fragmentNames) // clone array.
    this.missingFragmentsNames = [].concat(fragmentNames) // clone array.

    // Register fragment on the query when has no missing fragments.
    if (this.props.fetchPolicy !== 'cache-only' && !this.missingFragmentsNames.length) {
      this.getQueryContext().registerFragment(
        this.fragment,
        this.arguments,
      )
    }

    if (this.props.fetchPolicy !== 'cache-only' && this.props.variables) {
      this.hoistVariables(this.props.variables)
    }
  }

  componentWillReceiveProps ({ variables, fetchPolicy }) {
    if (fetchPolicy !== 'cache-only' && !equals(this.props.variables, variables)) {
      this.hoistVariables(variables)
    }
  }

  /**
   * Hoist variable values to closest query context.
   */
  hoistVariables = variables => {
    const renamedVariables = []

    Object.keys(this.argumentsNamesMap).forEach(
      renamed => {
        if (variables[this.argumentsNamesMap[renamed]]) {
          renamedVariables[renamed] = variables[this.argumentsNamesMap[renamed]]
        }
      }
    )

    this.getQueryContext().receiveVariables(renamedVariables)
  }

  /**
   * Find the queryContext this fragment belongs to.
   * @TODO: could this be memoized?
   */
  getQueryContext = () => {
    const queryContext = this.props.queryContexts.reverse().find(
      queryContext => queryContext.contains(this.fragment)
    )

    if (!queryContext) throw ERRORS.NO_PARENT_QUERY

    return queryContext
  }

  /**
   * Identifies if a nested fragment belongs to this fragment.
   *
   * @TODO: should memoize this.
   */
  contains = fragment => this.fragmentNames.indexOf(getFragmentName(fragment)) !== -1

  /**
   * Register a new fragment to this fragment and this fragment's query.
   *
   * @TODO: avoid performing setState for each found fragment.
   * @TODO: only register fragments contained in this query.
   */
  registerFragment = (fragment, args = []) => {
    // Early ignore when no more fragment is missing.
    if (this.missingFragmentsNames.length) {
      const names = getFragmentNames(fragment)
      const indexes = names
        .map(name => this.missingFragmentsNames.indexOf(name))
        .filter(index => index !== -1)

      // Ignore when this fragment is not missing.
      if (indexes.length) {
        // Remove from missing.
        indexes.forEach(index => this.missingFragmentsNames.splice(index, 1))
        // Add fragment to stack.
        this.fragments.push(fragment)

        // Save child fragment's arguments.
        this.arguments = this.arguments.concat(args)

        // When no more missing fragments, save fragment change and update parent query.
        if (!this.missingFragmentsNames.length) {
          this.fragment = concatAST([this.fragment, ...this.fragments])

          if (this.props.fetchPolicy !== 'cache-only') {
            this.getQueryContext().registerFragment(
              this.fragment,
              this.arguments
            )
          }
        }
      }
    }
  }

  /**
   * Get the result for a given fragment.
   */
  getFragmentData = () => {
    const { fragment, fragmentName } = this
    const { id } = this.props

    // Fragment data can only be fetched when id is provided.
    return (id && this.props.client.readFragment({ id, fragment, fragmentName })) || {}
  }

  render () {
    const { children, queryContexts } = this.props

    const defaultQueryContext = {
      result: {
        data: {},
        error: undefined,
        loading: false
      }
    }

    // Find this fragment's parent query context.
    const queryContext = this.props.fetchPolicy !== 'cache-only'
      ? this.getQueryContext()
      : defaultQueryContext

    const { result } = queryContext

    // Construct results relative to this fragment.
    const data = this.props.fetchPolicy !== 'network-only' || !result.loading
      ? this.getFragmentData()
      : {}

    const fragmentContext = {
      ...queryContext,
      fragment: this.fragment,
      contains: this.contains,
      registerFragment: this.registerFragment
    }

    return (
      <QueryContext.Provider value={ queryContexts.concat(fragmentContext) }>
        { children({ ...result, queryData: result.data, data }) }
      </QueryContext.Provider>
    )
  }
}

/**
 * Export a queryContext connected version of Fragment.
 */
export const Fragment = props => (
  <QueryContext.Consumer>
    { queryContexts => (
      <ApolloConsumer>
        { client => (
          <QueryFragment { ...props } client={ client } queryContexts={ queryContexts } />
        ) }
      </ApolloConsumer>
    ) }
  </QueryContext.Consumer>
)
