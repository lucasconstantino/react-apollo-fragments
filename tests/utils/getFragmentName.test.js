import gql from 'graphql-tag'

import { getFragmentName } from 'react-apollo-defragment'

describe('getFragmentName', () => {
  it('should extract a fragment AST name', () => {
    const fragment = gql`
      fragment Fragment on Type {
        field
      }
    `

    expect(getFragmentName(fragment)).toBe('Fragment')
  })

  it('should silently return null when no fragment is found', () => {
    const fragment = gql`
      query Name {
        field
      }
    `

    expect(getFragmentName(fragment)).toBe(null)
  })
})
