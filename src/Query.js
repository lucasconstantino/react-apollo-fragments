import React, { PureComponent, createContext } from 'react'
import PropTypes from 'prop-types'
import { concatAST } from 'graphql'
import { Query as ApolloQuery } from 'react-apollo'

import {
  getFragmentName,
  getFragmentNames,
  getRequestedFragmentNames,
  addFragmentArguments,
  unique
} from './utils'

// Create a theme context, defaulting to light theme
export const QueryContext = createContext([])

// Define a query context contract.
export const QueryContextPropType = PropTypes.shape({
  registerFragment: PropTypes.func.isRequired,
})

export class Query extends PureComponent {
  static propTypes = {
    skip: PropTypes.bool,
    query: PropTypes.object.isRequired, // AST proptype?
    children: PropTypes.func.isRequired,
    variables: PropTypes.object,
  }

  constructor (props) {
    super(props)

    const fragmentNames = getRequestedFragmentNames(props.query).filter(unique)

    this.state = {
      ready: fragmentNames.length === 0,
      query: props.query,
      fragmentVariables: {},
    }

    this.fragments = []
    this.fragmentArguments = []
    this.fragmentVariables = {}

    this.fragmentNames = [].concat(fragmentNames) // clone array.
    this.missingFragmentsNames = [].concat(fragmentNames) // clone array.
  }

  componentDidMount () {
    if (!this.state.ready) {
      this.setState({
        ready: true
      })
    }
  }

  /**
   * Identifies if a fragment belongs to this query.
   *
   * @TODO: should memoize this.
   */
  contains = fragment => this.fragmentNames.indexOf(getFragmentName(fragment)) !== -1

  /**
   * Register hoisted variables.
   */
  receiveVariables = variables => {
    this.setState({
      fragmentVariables: {
        ...this.state.fragmentVariables,
        ...variables
      }
    })
  }

  /**
   * Register a new fragment to this query.
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
        this.fragmentArguments.push(...args)

        // When no more missing fragments, alter parent query.
        if (!this.missingFragmentsNames.length) {
          this.setState({
            ready: true,
            query: addFragmentArguments(
              concatAST([this.state.query, ...this.fragments]),
              this.fragmentArguments
            )
          })
        }
      }
    }
  }

  render () {
    const { children, variables, ...props } = this.props
    const { query, fragmentVariables } = this.state

    const resultingVariables = { ...variables, ...fragmentVariables }
    const skip = props.skip || !this.state.ready

    return (
      <QueryContext.Consumer>
        { queryContexts => (
          <ApolloQuery { ...props } variables={ resultingVariables } query={ query } skip={ skip }>
            { result => {
              const queryContext = {
                query,
                result,
                contains: this.contains,
                registerFragment: this.registerFragment,
                receiveVariables: this.receiveVariables,
              }

              return (
                <QueryContext.Provider value={ queryContexts.concat(queryContext) }>
                  { children(result) }
                </QueryContext.Provider>
              )
            } }
          </ApolloQuery>
        ) }
      </QueryContext.Consumer>
    )
  }
}
