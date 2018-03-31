import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

import { QueryContext } from './Query'

export const ERRORS = {
  NO_PARENT_QUERY: new Error('Fragment component must be nested in a Query or Mutation component'),
  NO_FRAGMENT_PROP: new Error('Fragment component must be provided with a fragment prop'),
}

class QueryFragment extends PureComponent {
  static propTypes = {
    id: PropTypes.string, // Optional fragment cache id.
    queryContext: PropTypes.any.isRequired,
    fragment: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,
  }

  constructor (...args) {
    super(...args)

    if (!this.props.queryContext) throw ERRORS.NO_PARENT_QUERY
    if (!this.props.fragment) throw ERRORS.NO_FRAGMENT_PROP

    // Register fragment:
    // @TODO: it this fragment found on this query?
    this.props.queryContext.registerFragment(this.props.fragment)
  }

  render () {
    const { children, fragment, id, queryContext } = this.props

    const result = queryContext.getFragmentResult({ id, fragment })

    return children(result)
  }
}

export const Fragment = props => (
  <QueryContext.Consumer>
    { queryContext => (
      <QueryFragment { ...props } queryContext={ queryContext } />
    ) }
  </QueryContext.Consumer>
)
