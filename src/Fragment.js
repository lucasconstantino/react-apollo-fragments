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

    if (!this.props.fragment) throw ERRORS.NO_FRAGMENT_PROP

    // Find belonging query context.
    this.queryContext = this.props.queryContexts.reverse().find(
      queryContext => queryContext.contains(this.props.fragment)
    )

    if (!this.queryContext) throw ERRORS.NO_PARENT_QUERY

    // Register fragment:
    // @TODO: it this fragment found on this query?
    this.queryContext.registerFragment(this.props.fragment)
  }

  render () {
    const { children, fragment, id } = this.props

    // Generate a result object based on the query context.
    const result = this.queryContext.getFragmentResult({ id, fragment })

    return children(result)
  }
}

export const Fragment = props => (
  <QueryContext.Consumer>
    { queryContexts => (
      <QueryFragment { ...props } queryContexts={ queryContexts } />
    ) }
  </QueryContext.Consumer>
)
