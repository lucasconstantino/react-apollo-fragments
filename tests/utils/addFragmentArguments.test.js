import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'

import { UTILS_ERRORS, addFragmentArguments } from 'react-apollo-fragments'

describe('addFragmentArguments', () => {
  const argument = gql`query ($argument: String!) { field }`
    .definitions[0].variableDefinitions[0]

  it('should insert arguments to AST with no argument', () => {
    const query = gql`
      query {
        field
      }
    `

    const result = print(addFragmentArguments(query, [argument]))

    expect(result).toContain('($argument: String!)')
  })

  it('should insert arguments to AST with arguments', () => {
    const query = gql`
      query ($a: Int!) {
        field
      }
    `

    const result = print(addFragmentArguments(query, [argument]))

    expect(result).toContain('($a: Int!, $argument: String!)')
  })

  it('should throw when arguments conflict with current AST arguments', () => {
    const query = gql`
      query ($argument: Int!) {
        field
      }
    `

    expect(() => addFragmentArguments(query, [argument]))
      .toThrow(UTILS_ERRORS.DUPLICATED_ARGUMENT('argument', 'String!', 'Int!'))
  })
})
