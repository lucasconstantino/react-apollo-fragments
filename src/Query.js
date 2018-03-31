import React, { PureComponent, createContext } from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'
import { Query as ApolloQuery } from 'react-apollo'

// Create a theme context, defaulting to light theme
export const QueryContext = createContext()

export class Query extends PureComponent {
  static propTypes = {
    skip: PropTypes.bool,
    query: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,
  }

  constructor (props) {
    super(props)

    this.state = { query: props.query }
  }

  /**
   * Register a new fragment to this query.
   *
   * @TODO: avoid performing setState for each found fragment.
   * @TODO: only register fragments contained in this query.
   */
  registerFragment = fragment => {
    this.setState({ query: concatAST([this.state.query, fragment]) })
  }

  /**
   * Get the result for a given fragment.
   */
  getFragmentResult = ({ data, client, ...result }) => ({ id, fragment, optimistic }) => ({
    ...result,

    // Provide full query resulting data.
    queryData: data,

    // Provide fragment specific data, when id is given.
    data: (id && client.readFragment({ id, fragment }, optimistic)) || {},

    // Reinsert client.
    client,
  })

  render () {
    const { children, ...props } = this.props

    return (
      <ApolloQuery { ...props } query={ this.state.query }>
        { result => (
          <QueryContext.Provider value={ {
            query: this.state.query,
            registerFragment: this.registerFragment,
            getFragmentResult: this.getFragmentResult(result)
          } }>
            { children(result) }
          </QueryContext.Provider>
        ) }
      </ApolloQuery>
    )
  }
}
