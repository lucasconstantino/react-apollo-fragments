import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'

import { QueryContext, QueryContextPropType } from './Query'

import {
  getFragmentName,
  getFragmentNames,
  getRequestedFragmentNames,
  unique
} from './utils'

export const ERRORS = {
  NO_PARENT_QUERY: new Error('Fragment component must belong to a parent Query or Mutation component'),
  NO_FRAGMENT_PROP: new Error('Fragment component must be given a fragment prop'),
}

class QueryFragment extends PureComponent {
  static propTypes = {
    id: PropTypes.string, // Optional fragment cache id.
    fragment: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,
    queryContexts: PropTypes.arrayOf(QueryContextPropType).isRequired,
  }

  constructor (...args) {
    super(...args)

    this.fragment = this.props.fragment

    // Ensure minimal props.
    if (!this.fragment) throw ERRORS.NO_FRAGMENT_PROP

    const fragmentNames = getRequestedFragmentNames(this.fragment).filter(unique)

    this.fragments = []
    this.fragmentNames = [].concat(fragmentNames) // clone array.
    this.missingFragmentsNames = [].concat(fragmentNames) // clone array.

    // Register fragment on the query when has no missing fragments.
    if (!this.missingFragmentsNames.length) {
      this.getQueryContext().registerFragment(this.fragment)
    }
  }

  /**
   * Find the queryContext this fragment belongs to.
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
  registerFragment = fragment => {
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

        // When no more missing fragments, alter parent query.
        if (!this.missingFragmentsNames.length) {
          this.fragment = concatAST([this.fragment, ...this.fragments])
          this.getQueryContext().registerFragment(this.fragment)
        }
      }
    }
  }

  render () {
    const { children, id, queryContexts } = this.props

    // Find this fragment's parent query context.
    const queryContext = this.getQueryContext()

    // Construct results relative to this fragment.
    const result = queryContext.getFragmentResult({ id, fragment: this.fragment })

    const fragmentContext = {
      ...queryContext,
      fragment: this.fragment,
      contains: this.contains,
      registerFragment: this.registerFragment
    }

    return (
      <QueryContext.Provider value={ queryContexts.concat(fragmentContext) }>
        { children(result) }
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
      <QueryFragment { ...props } queryContexts={ queryContexts } />
    ) }
  </QueryContext.Consumer>
)
