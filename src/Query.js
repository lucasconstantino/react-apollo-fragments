import React from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'
import { Query as ApolloQuery } from 'react-apollo'

import { getQueryFragmentsFromTree } from './utils'

const hold = func => () => {
  throw new Error(`Cannot execute \`${func}\` while extracting fragments`)
}

const temporaryResponse = {
  data: {},
  variables: {},
  refetch: hold('refetch'),
  fetchMore: hold('fetchMore'),
  updateQuery: hold('updateQuery'),
  startPolling: hold('startPolling'),
  stopPolling: hold('stopPolling'),
  subscribeToMore: hold('subscribeToMore'),
  loading: true,
  networkStatus: 1,
  error: undefined,
  defragmenting: true,
}

/**
 * Fragment extraction capable version of react-apollo's Query component.
 */
class DefragmentedQuery extends React.PureComponent {
  static propTypes = {
    query: PropTypes.object, // AST propType?
    children: PropTypes.func,
  }

  static contextTypes = {
    defragmenting: PropTypes.bool,
  }

  static childContextTypes = {
    defragmenting: PropTypes.bool,
  }

  getChildContext () {
    return {
      defragmenting: !this.state.composedQuery || this.state.defragmenting
    }
  }

  constructor (...args) {
    super(...args)

    this.state = {
      composedQuery: null,
      defragmenting: false,
    }
  }

  componentDidMount () {
    this.__isMounted = true
  }

  componentWillUnmount () {
    this.__isMounted = false
  }

  defragment = tree => setTimeout(() => {
    if (this.__isMounted) {
      this.setState({
        defragmenting: true
      })
    }

    getQueryFragmentsFromTree(tree, this.props.query).then(async fragments => {
      // Only update if component is still mounted.
      if (this.__isMounted) {
        this.setState({
          defragmenting: false,
          composedQuery: fragments.length
            ? concatAST([
              this.props.query,
              ...fragments
            ])
            : this.props.query
        })
      }
    })
  })

  render () {
    const { children, ...props } = this.props

    if (!this.state.composedQuery) {
      const tree = children({ ...props, ...temporaryResponse })

      if (!this.state.defragmenting) {
        this.defragment(tree)
      }

      return tree
    }

    if (this.context.defragmenting) {
      return children({ ...props, ...temporaryResponse })
    }

    return (
      <ApolloQuery query={ this.state.composedQuery }>
        { results => children({ ...results, defragmenting: false }) }
      </ApolloQuery>
    )
  }
}

export const Query = DefragmentedQuery
