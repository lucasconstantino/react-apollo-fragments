import gql from 'graphql-tag'

import { getFragmentNames } from 'react-apollo-fragments'

describe('getFragmentNames', () => {
  it('should extract a single fragment name from AST', () => {
    const fragment = gql`
      fragment Fragment on Type {
        field
      }
    `

    expect(getFragmentNames(fragment)).toEqual(['Fragment'])
  })

  it('should silently return null when no fragment is found in AST', () => {
    const fragment = gql`
      query Name {
        field
      }
    `

    expect(getFragmentNames(fragment)).toEqual([])
  })

  it('should extract multiple fragment names from AST', () => {
    const fragment = gql`
      fragment A on Type {
        field
      }

      fragment B on Type {
        field
      }
    `

    expect(getFragmentNames(fragment)).toEqual(['A', 'B'])
  })
})
