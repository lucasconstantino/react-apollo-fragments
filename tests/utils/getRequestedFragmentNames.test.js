import gql from 'graphql-tag'

import { getRequestedFragmentNames } from 'react-apollo-defragment'

describe('getRequestedFragmentNames', () => {
  it('should extract a single fragment name from the query', () => {
    const fragment = gql`
      query Name {
        field {
          ...Fragment
        }
      }
    `

    expect(getRequestedFragmentNames(fragment)).toEqual(['Fragment'])
  })

  it('should extract multiple fragment names from the query', () => {
    const fragment = gql`
      query Name {
        field {
          ...FirstFragment
          ...SecondFragment
        }
      }
    `

    expect(getRequestedFragmentNames(fragment))
      .toEqual(['FirstFragment', 'SecondFragment'])
  })

  it('should extract first-level fragment names', () => {
    const fragment = gql`
      query Name {
        ...Fragment
      }
    `

    expect(getRequestedFragmentNames(fragment))
      .toEqual(['Fragment'])
  })

  it('should silently return an empty array when no fragment is found', () => {
    const fragment = gql`
      query Name {
        field
      }
    `

    expect(getRequestedFragmentNames(fragment)).toEqual([])
  })

  it('should not conflict with inline fragments', () => {
    const fragment = gql`
      query Name {
        ... on Fragment {
          field
        }

        ...NamedFragment
      }
    `

    expect(getRequestedFragmentNames(fragment)).toEqual(['NamedFragment'])
  })
})
