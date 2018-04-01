import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

import { QueryContext, QueryContextPropTypes } from './Query'

export const ERRORS = {
  NO_PARENT_QUERY: new Error('Fragment component must belong to a parent Query or Mutation component'),
  NO_FRAGMENT_PROP: new Error('Fragment component must be give a fragment prop'),
}

class QueryFragment extends PureComponent {
  static propTypes = {
    id: PropTypes.string, // Optional fragment cache id.
    fragment: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,
    queryContexts: PropTypes.arrayOf(QueryContextPropTypes).isRequired,
  }

  constructor (...args) {
    super(...args)

    // Ensure minimal props.
    if (!this.props.fragment) throw ERRORS.NO_FRAGMENT_PROP

    // Register fragment on the query.
    this.getQueryContext().registerFragment(this.props.fragment)
  }

  /**
   * Find the queryContext this fragment belongs to.
   */
  getQueryContext = () => {
    const queryContext = this.props.queryContexts.reverse().find(
      queryContext => queryContext.contains(this.props.fragment)
    )

    if (!queryContext) throw ERRORS.NO_PARENT_QUERY

    return queryContext
  }

  render () {
    const { children, fragment, id } = this.props

    // Inject results relative to this fragment.
    const result = this.getQueryContext().getFragmentResult({ id, fragment })

    return children(result)
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
