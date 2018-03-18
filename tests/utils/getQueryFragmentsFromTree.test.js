/* eslint-disable react/prop-types */
import React from 'react'
import gql from 'graphql-tag'

import { getQueryFragmentsFromTree } from 'react-apollo-refragment'

describe('getQueryFragmentsFromTree', () => {
  const getFragmentComponent = ({
    name = 'Fragment',
    type = 'Type',
    fields = 'field'
  } = {}) => {
    const FragmentComponent = ({ children }) => <div>{ children }</div>

    FragmentComponent.fragment = gql`
      fragment ${name} on ${type} {
        ${fields}
      }
    `

    return FragmentComponent
  }

  it('should extract a present fragment', async () => {
    const Component = getFragmentComponent()
    const tree = (
      <Component />
    )

    const query = gql`
      query Query {
        type {
          ...Fragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(1)
    expect(fragments[0].loc.source.body).toContain('fragment Fragment on Type')
  })

  it('should NOT extract a non-present fragment', async () => {
    const Component = getFragmentComponent()
    const tree = (
      <Component />
    )

    const query = gql`
      query Query {
        type {
          ...NonExistingFragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(0)
  })

  it('should extract a inner-level present fragment', async () => {
    const Component = getFragmentComponent()
    const tree = (
      <div>
        <div>
          <Component />
        </div>
      </div>
    )

    const query = gql`
      query Query {
        type {
          ...Fragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(1)
    expect(fragments[0].loc.source.body).toContain('fragment Fragment on Type')
  })

  it('should extract multiple fragments', async () => {
    const FirstComponent = getFragmentComponent({ name: 'FirstFragment' })
    const SecondComponent = getFragmentComponent({ name: 'SecondFragment' })
    const tree = (
      <div>
        <FirstComponent />
        <SecondComponent />
      </div>
    )

    const query = gql`
      query Query {
        type {
          ...FirstFragment
          ...SecondFragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(2)
    expect(fragments[0].loc.source.body).toContain('fragment FirstFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment SecondFragment on Type')
  })

  it('should extract nested fragments', async () => {
    const ChildComponent = getFragmentComponent({ name: 'ChildFragment' })

    const ParentComponent = getFragmentComponent({
      name: 'ParentFragment',
      fields: '...ChildFragment'
    })

    const tree = (
      <div>
        <ParentComponent>
          <ChildComponent />
        </ParentComponent>
      </div>
    )

    const query = gql`
      query Query {
        type {
          ...ParentFragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(2)
    expect(fragments[0].loc.source.body).toContain('fragment ParentFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment ChildFragment on Type')
  })

  it('should extract multiple nested fragments', async () => {
    const FirstChildComponent = getFragmentComponent({ name: 'FirstFragment' })
    const SecondChildComponent = getFragmentComponent({ name: 'SecondFragment' })

    const ParentComponent = getFragmentComponent({
      name: 'ParentFragment',
      fields: `
        ...FirstFragment
        ...SecondFragment
      `
    })

    const tree = (
      <div>
        <ParentComponent>
          <FirstChildComponent />
          <SecondChildComponent />
        </ParentComponent>
      </div>
    )

    const query = gql`
      query Query {
        type {
          ...ParentFragment
        }
      }
    `

    const fragments = await getQueryFragmentsFromTree(tree, query)

    expect(fragments.length).toBe(3)
    expect(fragments[0].loc.source.body).toContain('fragment ParentFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment FirstFragment on Type')
    expect(fragments[2].loc.source.body).toContain('fragment SecondFragment on Type')
  })

  it('should extract once a duplicated fragment')
})
