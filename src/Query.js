import React, { PureComponent, createContext } from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'
import { Query as ApolloQuery } from 'react-apollo'

import { getFragmentName, getRequestedFragmentNames } from './utils'

const unique = (v, i, arr) => arr.indexOf(v) === i

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

    this.fragments = []
    this.missingFragmentsNames = getRequestedFragmentNames(props.query).filter(unique)
  }

  /**
   * Register a new fragment to this query.
   *
   * @TODO: avoid performing setState for each found fragment.
   * @TODO: only register fragments contained in this query.
   */
  registerFragment = fragment => {
    // Early ignore when no more fragment is missing.
    if (this.missingFragmentsNames.length) {
      const name = getFragmentName(fragment)
      const index = this.missingFragmentsNames.indexOf(name)

      // Ignore when this fragment is not missing.
      if (index !== -1) {
        // Remove from missing.
        this.missingFragmentsNames.splice(index, 1)
        // Add fragment to stack.
        this.fragments.push(fragment)

        // When no more missing fragments, alter parent query.
        if (!this.missingFragmentsNames.length) {
          this.setState({ query: concatAST([this.state.query, ...this.fragments]) })
        }
      }
    }
  }

  /**
   * Get the result for a given fragment.
   */
  getFragmentResult = result => ({ id, fragment, optimistic }) => {
    const { data: queryData, client } = result

    // Fragment data can only be fetched when id is provided.
    const data = (id && client.readFragment({ id, fragment }, optimistic)) || {}

    // Provide query resulting data on the queryData prop.
    // Provide fragment specific data on the data prop.
    return { ...result, queryData, data }
  }

  render () {
    const { children, ...props } = this.props

    return (
      <ApolloQuery { ...props } query={ this.state.query }>
        { result => {
          const context = {
            query: this.state.query,
            registerFragment: this.registerFragment,
            getFragmentResult: this.getFragmentResult(result)
          }

          return (
            <QueryContext.Provider value={ context }>
              { children(result) }
            </QueryContext.Provider>
          )
        } }
      </ApolloQuery>
    )
  }
}
