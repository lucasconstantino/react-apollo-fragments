import gql from 'graphql-tag'
import { print } from 'graphql/language/printer'

import { extractFragmentArguments } from 'react-apollo-fragments'

describe('extractFragmentArguments', () => {
  it('should do nothing on non-argumented fragments', () => {
    const fragment = gql`
      fragment Fragment on Type {
        field
      }
    `

    const result = print(extractFragmentArguments(fragment))

    expect(result).toBe(print(fragment))
  })

  it('should remove fragment arguments from AST', () => {
    const fragment = gql`
      fragment Fragment ($argument: String!) on Type {
        field (argument: $argument)
      }
    `

    const result = extractFragmentArguments(fragment)

    expect(print(result)).not.toContain('$argument: String!')
  })

  it('should remove multiple arguments from fragment AST', () => {
    const fragment = gql`
      fragment Fragment ($a: String!, $b: Int!) on Type {
        field (argument: $argument)
      }
    `

    const result = print(extractFragmentArguments(fragment))

    expect(result).not.toContain('$a: String!')
    expect(result).not.toContain('$b: Int!')
  })

  it('should remove multiple fragments arguments from AST', () => {
    const fragment = gql`
      fragment A ($a: String!) on Type {
        field (a: $a)
      }

      fragment B ($b: Int!) on Type {
        field (b: $b)
      }
    `

    const result = print(extractFragmentArguments(fragment))

    expect(result).not.toContain('$a: String!')
    expect(result).not.toContain('$b: Int!')
  })

  it('should extract fragment arguments to provided `save` array', () => {
    const fragment = gql`
      fragment Fragment ($argument: String) on Type {
        field (argument: $argument)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toEqual(fragment.definitions[0].variableDefinitions)
  })

  it('should extract multiple fragment arguments to provided `save` array', () => {
    const fragment = gql`
      fragment Fragment ($a: String!, $b: Int!) on Type {
        field (a: $a, b: $b)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toEqual(fragment.definitions[0].variableDefinitions)
  })

  it('should extract arguments on multiple fragments to provided `save` array', () => {
    const fragment = gql`
      fragment A ($a: String!) on Type {
        field (a: $a)
      }

      fragment B ($b: Int!) on Type {
        field (b: $b)
      }
    `

    const save = []
    extractFragmentArguments(fragment, save)

    expect(save).toEqual(
      fragment.definitions[0].variableDefinitions.concat(
        fragment.definitions[1].variableDefinitions
      )
    )
  })
})
