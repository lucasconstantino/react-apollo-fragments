import React from 'react'
import { mount } from 'enzyme'
import { concatAST } from 'graphql'
import { default as originalGql } from 'graphql-tag'
import { addTypenameToDocument } from 'apollo-utilities'
import console from 'console-suppress'

import { MockedProvider } from '../local_modules/react-apollo/test-utils'

import { Fragment, Query } from 'react-apollo-defragment'
import { ERRORS } from 'react-apollo-defragment/Fragment'

const sleep = (ms = 1) => new Promise(resolve => setTimeout(resolve, ms))

const gql = (...args) => addTypenameToDocument(originalGql(...args))

describe.only('Fragment', () => {
  // Testing children render prop implementations.
  const childrens = {}
  childrens.nil = jest.fn(() => null)
  childrens.div = jest.fn(() => <div>content</div>)

  // Testing fragment documents.
  const fragment = gql`fragment NamedOnType on Type { field }`

  // Testing query documents.
  const queries = {
    simple: gql`query Simple { typeResolver { id ...NamedOnType } }`
  }

  const defragmentedQueries = {
    simple: concatAST([queries.simple, fragment])
  }

  const mocks = {
    simple: [{
      request: { query: defragmentedQueries.simple },
      result: { data: { typeResolver: { id: '1', field: 'value', __typename: 'Type' } } }
    }]
  }

  const wrappedListener = jest.fn()

  const wrapInQuery = element => (
    <MockedProvider mocks={ mocks.simple } removeTypename>
      <Query query={ queries.simple }>
        { wrappedListener.mockReturnValue(element) }
      </Query>
    </MockedProvider>
  )

  beforeEach(jest.clearAllMocks)
  beforeEach(console.cleanSuppressors)

  it('should render children', () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragment }>{ childrens.div }</Fragment>
    ))

    expect(childrens.div).toHaveBeenCalled()
    expect(wrapper.html()).toBe('<div>content</div>')
  })

  it('should throw when no fragment is provided', () => {
    console.error.suppress(
      /The above error occurred in the/,
      new RegExp(ERRORS.NO_FRAGMENT_PROP),
      /The prop `fragment` is marked as required/
    )

    expect(() => mount(wrapInQuery(<Fragment>{ childrens.nil }</Fragment>)))
      .toThrow(ERRORS.NO_FRAGMENT_PROP)

    expect(childrens.nil).not.toHaveBeenCalled()
  })

  it('should throw when not nested in a Query/Mutation component', () => {
    console.error.suppress([
      /The above error occurred in the/,
      new RegExp(ERRORS.NO_PARENT_QUERY),
      /The prop `queryContext` is marked as required/
    ])

    expect(() => mount(<Fragment fragment={ fragment }>{ childrens.nil }</Fragment>))
      .toThrow(ERRORS.NO_PARENT_QUERY)
  })

  it('should automatically add fragments to a parent query', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragment }>{ childrens.nil }</Fragment>
    ))

    await sleep()
    wrapper.update()

    expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeResolver.field', 'value')
  })

  it('should provide Fragment children with query result object', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragment }>{ childrens.nil }</Fragment>
    ))

    await sleep()
    wrapper.update()

    expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
    expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
    expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)

    const resultKeys = [
      'variables',
      'refetch',
      'fetchMore',
      'updateQuery',
      'startPolling',
      'stopPolling',
      'subscribeToMore',
      'loading',
      'networkStatus',
      'error',
      'client',
    ]

    resultKeys.forEach(key => {
      expect(childrens.nil.mock).toHaveProperty(`calls.2.0.${key}`)
    })
  })

  it('should provide Fragment children with fragment result data when id is available', async () => {
    const wrapper = mount(
      <MockedProvider mocks={ mocks.simple } removeTypename>
        <Query query={ queries.simple }>
          { ({ data, client }) => {
            const id = data.typeResolver && client.cache.config.dataIdFromObject(
              data.typeResolver
            )

            return (
              <Fragment fragment={ fragment } id={ id }>
                { childrens.nil }
              </Fragment>
            )
          } }
        </Query>
      </MockedProvider>
    )

    await sleep()
    wrapper.update()

    expect(childrens.nil.mock).toHaveProperty('calls.2.0.data.field', 'value')
  })

  it('should provide Fragment children with fragment optimistic result data')
})
