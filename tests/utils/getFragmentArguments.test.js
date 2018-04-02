import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'

import { extractFragmentArguments } from 'react-apollo-fragments'

describe('extractFragmentArguments', () => {
  it('should extract fragment arguments from AST', () => {
    const fragment = gql`
      fragment Fragment on Type @arguments(argument: "String!") {
        field (argument: $argument)
      }
    `

    const result = extractFragmentArguments(fragment)

    expect(print(fragment)).toContain('@arguments(argument: "String!")')
    expect(print(result)).not.toContain('@arguments(argument: "String!")')
  })

  it('should extract multiple arguments from fragment AST', () => {
    const fragment = gql`
      fragment Fragment on Type @arguments(
        a: "String!",
        b: "Int!"
      ) {
        field (argument: $argument)
      }
    `

    const result = extractFragmentArguments(fragment)

    expect(print(fragment)).toContain('a: "String!"')
    expect(print(result)).not.toContain('a: "String!"')

    expect(print(fragment)).toContain('b: "Int!"')
    expect(print(result)).not.toContain('b: "Int!"')
  })

  it('should extract multiple fragments arguments from AST', () => {
    const fragment = gql`
      fragment A on Type @arguments(a: "String!") {
        field (a: $a)
      }

      fragment B on Type @arguments(b: "Int!") {
        field (b: $b)
      }
    `

    const result = extractFragmentArguments(fragment)

    expect(print(fragment)).toContain('@arguments(a: "String!")')
    expect(print(result)).not.toContain('@arguments(a: "String!")')

    expect(print(fragment)).toContain('@arguments(b: "Int!")')
    expect(print(result)).not.toContain('@arguments(b: "Int!")')
  })

  it('should add extracted fragment arguments to provided `save` array', () => {
    const fragment = gql`
      fragment Fragment on Type @arguments(argument: "String!") {
        field (argument: $argument)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toHaveProperty('0.name', 'argument')
    expect(save).toHaveProperty('0.fragment', 'Fragment')
    expect(save).toHaveProperty('0.value', 'String!')
  })

  it('should add multiple extracted arguments on fragment to provided `save` array', () => {
    const fragment = gql`
      fragment Fragment on Type @arguments(
        a: "String!",
        b: "Int!"
      ) {
        field (argument: $argument)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toHaveProperty('0.name', 'a')
    expect(save).toHaveProperty('0.fragment', 'Fragment')
    expect(save).toHaveProperty('0.value', 'String!')

    expect(save).toHaveProperty('1.name', 'b')
    expect(save).toHaveProperty('1.fragment', 'Fragment')
    expect(save).toHaveProperty('1.value', 'Int!')
  })

  it('should add extracted arguments on multiple fragments to provided `save` array', () => {
    const fragment = gql`
      fragment A on Type @arguments(a: "String!") {
        field (a: $a)
      }

      fragment B on Type @arguments(b: "Int!") {
        field (b: $b)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toHaveProperty('0.name', 'a')
    expect(save).toHaveProperty('0.fragment', 'A')
    expect(save).toHaveProperty('0.value', 'String!')

    expect(save).toHaveProperty('1.name', 'b')
    expect(save).toHaveProperty('1.fragment', 'B')
    expect(save).toHaveProperty('1.value', 'Int!')
  })
})
