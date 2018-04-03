import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'

import { prefixFragmentArguments } from 'react-apollo-fragments'

describe('prefixFragmentArguments', () => {
  it('should rename fragment arguments on AST', () => {
    const fragment = gql`
      fragment Fragment ($argument: String!) on Type {
        field
      }
    `

    const result = print(prefixFragmentArguments(fragment))

    expect(result).toContain('$Fragment__argument: String!')
  })

  it('should rename multiple fragments arguments on AST', () => {
    const fragment = gql`
      fragment A ($argument: String!) on Type {
        field
      }

      fragment B ($argument: String!) on Type {
        field
      }
    `

    const result = print(prefixFragmentArguments(fragment))

    expect(result).toContain('fragment A($A__argument: String!)')
    expect(result).toContain('fragment B($B__argument: String!)')
  })

  it('should rename field argument usage on AST', () => {
    const fragment = gql`
      fragment Fragment ($argument: String!) on Type {
        field (usage: $argument)
      }
    `

    const result = print(prefixFragmentArguments(fragment))

    expect(result).toContain('$Fragment__argument: String!')
    expect(result).toContain('usage: $Fragment__argument')
  })

  it('should not rename undeclared argument usage on AST', () => {
    const fragment = gql`
      fragment Fragment ($argument: String!) on Type {
        field (usage: $argument, undeclared: $undeclared)
      }
    `

    const result = print(prefixFragmentArguments(fragment))

    expect(result).toContain('$Fragment__argument: String!')
    expect(result).toContain('usage: $Fragment__argument, undeclared: $undeclared')
  })

  it('should rename multiple fragments field argument usage on AST', () => {
    const fragment = gql`
      fragment A ($argument: String!) on Type {
        field (usage: $argument)
      }

      fragment B ($argument: String!) on Type {
        field (usage: $argument)
      }
    `

    const result = print(prefixFragmentArguments(fragment))

    expect(result).toContain('fragment A($A__argument: String!)')
    expect(result).toContain('(usage: $A__argument)')

    expect(result).toContain('fragment B($B__argument: String!)')
    expect(result).toContain('(usage: $B__argument)')
  })
})
