
/* eslint-disable react/prop-types */
import React from 'react'
import gql from 'graphql-tag'
import { ApolloClient } from 'apollo-client'
import { SchemaLink } from 'apollo-link-schema'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools'
import { ApolloProvider } from 'react-apollo'
import { mount } from 'enzyme'

import { Query } from 'react-apollo-defragment'

const typeDefs = `
  type Query {
    field: String
    typeOne: TypeOne
    typeTwo: TypeTwo
  }

  type TypeOne {
    typeOneField: String
  }

  type TypeTwo {
    typeTwoField: String
    nestedType: NestedType
  }

  type NestedType {
    nestedTypeField: String
  }

  schema {
    query: Query
  }
`

const defaultMocks = {
  Query: () => ({
    field: 'fieldValue',
    typeOne: () => ({}),
    typeTwo: () => ({}),
  }),
  TypeOne: () => ({
    typeOneField: 'typeOneFieldValue'
  }),
  TypeTwo: () => ({
    typeTwoField: 'typeTwoFieldValue'
  })
}

const getMockedClient = (mocks = defaultMocks) => {
  const schema = makeExecutableSchema({ typeDefs })
  addMockFunctionsToSchema({ schema, mocks })

  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new SchemaLink({ schema })
  })
}

const noFragmentQuery = gql`
  query NoFragment {
    field
  }
`

const typeOneFragmentQuery = gql`
  query WithTypeOneFragment {
    typeOne {
      ...TypeOneFragment
    }
  }
`

const typeTwoFragmentQuery = gql`
  query WithTypeTwoFragment {
    typeTwo {
      ...TypeTwoFragment
    }
  }
`

const twoFragmentsQuery = gql`
  query WithTwoFragments {
    typeOne { ...TypeOneFragment }
    typeTwo { ...TypeTwoFragment }
  }
`

const typeOneFragment = gql`
  fragment TypeOneFragment on TypeOne {
    typeOneField
  }
`

const typeTwoFragment = gql`
  fragment TypeTwoFragment on TypeTwo {
    typeTwoField
  }
`

const DumbComponent = props => <div { ...props } />

const TypeOneFragmentComponent = props => <div { ...props } />
TypeOneFragmentComponent.fragment = typeOneFragment

const TypeTwoFragmentComponent = props => <div { ...props } />
TypeTwoFragmentComponent.fragment = typeTwoFragment

// const sleep = (ms = 1) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * @TODO: This is a very problematic code that intends to ensure any
 * query was resolved. We tried jest timer's control and promises, but
 * nothing did really work. Still, sometimes the test fails.
 */
const update = (...mocks) => {
  let interval

  return new Promise(resolve => {
    interval = setInterval(() => {
      const loaded = mocks.every(
        ({ mock: { calls } }) => calls.some(
          ([{ loading }]) => !loading
        )
      )

      if (loaded) {
        clearInterval(interval)
        resolve()
      }
    }, 10)
  }).catch(() => clearInterval(interval))
}

describe('Query', () => {
  let wrapper = mount(<DumbComponent />)

  afterEach(() => {
    // Ensure unmount for Apollo will still try to touch window if not so.
    wrapper.unmount()
  })

  it('should work exactly as does react-apollo\'s Query component', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => null)
    const ConnectedComponent = () => (
      <Query query={ noFragmentQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.field).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].data.field).toBe('fieldValue')
  })

  it('should resolve sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => <TypeOneFragmentComponent />)
    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
  })

  it('should resolve deep sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => (
      <div>
        <DumbComponent>
          <div>
            <TypeOneFragmentComponent />
          </div>
        </DumbComponent>
      </div>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
  })

  it('should resolve multiple sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent />
        <TypeTwoFragmentComponent />
      </div>
    ))

    const ConnectedComponent = () => (
      <Query query={ twoFragmentsQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
    expect(component.mock.calls[3][0].data.typeTwo.typeTwoField).toBe('typeTwoFieldValue')
  })

  it('should resolve duplicated sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent />
        <TypeOneFragmentComponent />
      </div>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
  })

  it('should resolve nested sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent>
          <TypeTwoFragmentComponent />
        </TypeOneFragmentComponent>
      </div>
    ))

    const ConnectedComponent = () => (
      <Query query={ twoFragmentsQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
    expect(component.mock.calls[3][0].data.typeTwo.typeTwoField).toBe('typeTwoFieldValue')
  })

  // Interference between nested fragments.
  // --------------------------------------

  it('should ignore non-interesting sub-component fragments', async () => {
    const client = getMockedClient()
    const component = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent>
          <TypeTwoFragmentComponent />
        </TypeOneFragmentComponent>
      </div>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { component }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(component.mock.calls[0][0].loading).toBe(true)
    expect(component.mock.calls[0][0].data.typeOne).toBeUndefined()

    await update(component)

    expect(component.mock.calls[3][0].loading).toBe(false)
    expect(component.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
    expect(component.mock.calls[3][0].data.typeTwo).toBeUndefined()
  })

  it('should resolve sub-component fragments on nested queries', async () => {
    const client = getMockedClient()

    const inner = jest.fn(() => (
      <TypeOneFragmentComponent />
    ))

    const outer = jest.fn(() => (
      <Query query={ noFragmentQuery }>
        { inner }
      </Query>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { outer }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(outer.mock.calls[0][0].loading).toBe(true)
    expect(outer.mock.calls[0][0].data.typeOne).toBeUndefined()

    expect(inner.mock.calls[0][0].loading).toBe(true)
    expect(inner.mock.calls[0][0].data.field).toBeUndefined()

    await update(outer, inner)

    expect(outer.mock.calls[3][0].loading).toBe(false)
    expect(outer.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')

    expect(inner.mock.calls[7][0].loading).toBe(false)
    expect(inner.mock.calls[7][0].data.field).toBe('fieldValue')
  })

  it('should resolve sub-component fragments on nested fragmented queries', async () => {
    const client = getMockedClient()

    const inner = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent />
        <TypeTwoFragmentComponent />
      </div>
    ))

    const outer = jest.fn(() => (
      <Query query={ typeTwoFragmentQuery }>
        { inner }
      </Query>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { outer }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(outer.mock.calls[0][0].loading).toBe(true)
    expect(outer.mock.calls[0][0].data.typeOne).toBeUndefined()

    expect(inner.mock.calls[0][0].loading).toBe(true)
    expect(inner.mock.calls[0][0].data.field).toBeUndefined()

    await update(outer, inner)

    expect(outer.mock.calls[3][0].loading).toBe(false)
    expect(outer.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')

    expect(inner.mock.calls[7][0].loading).toBe(false)
    expect(inner.mock.calls[7][0].data.typeTwo.typeTwoField).toBe('typeTwoFieldValue')
  })

  it('should resolve repeated sub-component fragments on nested fragmented queries', async () => {
    const client = getMockedClient()

    const inner = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent />
        <TypeTwoFragmentComponent />
      </div>
    ))

    const outer = jest.fn(() => (
      <Query query={ twoFragmentsQuery }>
        { inner }
      </Query>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { outer }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(outer.mock.calls[0][0].loading).toBe(true)
    expect(outer.mock.calls[0][0].data.typeOne).toBeUndefined()

    expect(inner.mock.calls[0][0].loading).toBe(true)
    expect(inner.mock.calls[0][0].data.field).toBeUndefined()

    await update(outer, inner)

    expect(outer.mock.calls[3][0].loading).toBe(false)
    expect(outer.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
    expect(outer.mock.calls[3][0].data.typeTwo).toBeUndefined()

    expect(inner.mock.calls[6][0].loading).toBe(false)
    expect(inner.mock.calls[6][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')
    expect(inner.mock.calls[6][0].data.typeTwo.typeTwoField).toBe('typeTwoFieldValue')
  })

  it('should not execute nested queries while defragmenting', async () => {
    const client = getMockedClient()

    const inner = jest.fn(() => (
      <div>
        <TypeOneFragmentComponent />
        <TypeTwoFragmentComponent />
      </div>
    ))

    const outer = jest.fn(() => (
      <Query query={ typeTwoFragmentQuery }>
        { inner }
      </Query>
    ))

    const ConnectedComponent = () => (
      <Query query={ typeOneFragmentQuery }>
        { outer }
      </Query>
    )

    wrapper = mount(
      <ApolloProvider client={ client }>
        <ConnectedComponent />
      </ApolloProvider>
    )

    expect(outer.mock.calls[0][0].loading).toBe(true)
    expect(outer.mock.calls[0][0].data.typeOne).toBeUndefined()

    expect(inner.mock.calls[0][0].loading).toBe(true)
    expect(inner.mock.calls[0][0].data.field).toBeUndefined()

    await update(outer, inner)

    expect(outer.mock.calls[3][0].loading).toBe(false)
    expect(outer.mock.calls[3][0].data.typeOne.typeOneField).toBe('typeOneFieldValue')

    // Identify amount of times the loading finished. Should be only one.
    expect(inner.mock.calls.filter(([{ loading }]) => !loading).length).toBe(1)
  })

  // @TODO: test temporarily injected data.
})
