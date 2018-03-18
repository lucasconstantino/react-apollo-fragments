/* eslint-disable react/prop-types */
import React from 'react'
import gql from 'graphql-tag'

import { getFragmentsFromTree } from 'react-apollo-defragment'

describe('getFragmentsFromTree', () => {
  const getFragmentComponent = ({
    name = 'Fragment',
    type = 'Type'
  } = {}) => {
    const Component = ({ children }) => <div>{ children }</div>
    Component.fragment = gql`
      fragment ${name} on ${type} {
        field
      }
    `
    return Component
  }

  it('should extract a first-level fragment', async () => {
    const Component = getFragmentComponent()
    const tree = (
      <Component />
    )

    const fragments = await getFragmentsFromTree(tree)

    expect(fragments.length).toBe(1)
    expect(fragments[0].loc.source.body).toContain('fragment Fragment on Type')
  })

  it('should extract a inner-level fragment', async () => {
    const Component = getFragmentComponent()
    const tree = (
      <div>
        <div>
          <Component />
        </div>
      </div>
    )

    const fragments = await getFragmentsFromTree(tree)

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

    const fragments = await getFragmentsFromTree(tree)

    expect(fragments.length).toBe(2)
    expect(fragments[0].loc.source.body).toContain('fragment FirstFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment SecondFragment on Type')
  })

  it('should extract nested fragments', async () => {
    const ParentComponent = getFragmentComponent({ name: 'ParentFragment' })
    const ChildComponent = getFragmentComponent({ name: 'ChildFragment' })
    const tree = (
      <div>
        <ParentComponent>
          <ChildComponent />
        </ParentComponent>
      </div>
    )

    const fragments = await getFragmentsFromTree(tree)

    expect(fragments.length).toBe(2)
    expect(fragments[0].loc.source.body).toContain('fragment ParentFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment ChildFragment on Type')
  })

  it('should extract multiple nested fragments', async () => {
    const ParentComponent = getFragmentComponent({ name: 'ParentFragment' })
    const FirstChildComponent = getFragmentComponent({ name: 'FirstFragment' })
    const SecondChildComponent = getFragmentComponent({ name: 'SecondFragment' })
    const tree = (
      <div>
        <ParentComponent>
          <FirstChildComponent />
          <SecondChildComponent />
        </ParentComponent>
      </div>
    )

    const fragments = await getFragmentsFromTree(tree)

    expect(fragments.length).toBe(3)
    expect(fragments[0].loc.source.body).toContain('fragment ParentFragment on Type')
    expect(fragments[1].loc.source.body).toContain('fragment FirstFragment on Type')
    expect(fragments[2].loc.source.body).toContain('fragment SecondFragment on Type')
  })

  describe('dive control', () => {
    it('should be possible to avoid first-level extraction', async () => {
      const Component = getFragmentComponent()
      const tree = (
        <Component />
      )

      const dive = () => false
      const fragments = await getFragmentsFromTree(tree, dive)

      expect(fragments.length).toBe(0)
    })

    it('should be possible to avoid inner-level extraction', async () => {
      const Component = getFragmentComponent()
      const tree = (
        <div>
          <Component />
        </div>
      )

      const dive = () => false
      const fragments = await getFragmentsFromTree(tree, dive)

      expect(fragments.length).toBe(0)
    })

    it('should receive extracted fragment on the diving predicate', async () => {
      const Component = getFragmentComponent()
      const tree = (
        <Component />
      )

      const dive = jest.fn(() => true)
      const fragments = await getFragmentsFromTree(tree, dive)

      expect(dive.mock.calls[0][0]).toBe(fragments[0])
    })
  })
})
