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
  const fragments = {
    TypeA_fieldA: gql`fragment FieldA_on_TypeA on TypeA { fieldA }`,
    TypeA_fieldB: gql`fragment FieldB_on_TypeA on TypeA { fieldB }`
  }

  // Testing query documents.
  const queries = {
    TypeA_fieldA: gql`query Simple { typeAResolver { id ...FieldA_on_TypeA } }`,
    TypeA_fieldA_fieldB: gql`query Simple { typeAResolver { id ...FieldA_on_TypeA ...FieldB_on_TypeA } }`,
  }

  const defragmentedQueries = {
    TypeA_fieldA: concatAST([queries.TypeA_fieldA, fragments.TypeA_fieldA]),
    TypeA_fieldA_fieldB: concatAST([queries.TypeA_fieldA, fragments.TypeA_fieldA, fragments.TypeA_fieldB]),
  }

  const mocks = {
    FieldA_on_TypeA: [{
      request: { query: defragmentedQueries.TypeA_fieldA },
      result: { data: { typeAResolver: { id: '1', fieldA: 'fieldA value', __typename: 'TypeA' } } }
    }],

    TypeA_fieldA_fieldB: [{
      request: { query: defragmentedQueries.TypeA_fieldA_fieldB }
    }]
  }

  const wrappedListener = jest.fn()

  const wrapInQuery = element => (
    <MockedProvider mocks={ mocks.FieldA_on_TypeA } removeTypename>
      <Query query={ queries.TypeA_fieldA }>
        { result => {
          if (result.error) console.error(result.error)
          return wrappedListener.mockReturnValue(element)(result)
        } }
      </Query>
    </MockedProvider>
  )

  beforeEach(jest.clearAllMocks)
  beforeEach(console.cleanSuppressors)

  it('should render children', () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.TypeA_fieldA }>{ childrens.div }</Fragment>
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

    expect(() => mount(<Fragment fragment={ fragments.TypeA_fieldA }>{ childrens.nil }</Fragment>))
      .toThrow(ERRORS.NO_PARENT_QUERY)
  })

  it('should add a fragment to a parent query', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.TypeA_fieldA }>{ childrens.nil }</Fragment>
    ))

    await sleep()
    wrapper.update()

    expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')
  })

  it('should provide Fragment children with query result object', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.TypeA_fieldA }>{ childrens.nil }</Fragment>
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
      <MockedProvider mocks={ mocks.FieldA_on_TypeA } removeTypename>
        <Query query={ queries.TypeA_fieldA }>
          { ({ data, client }) => {
            const id = data.typeAResolver && client.cache.config.dataIdFromObject(
              data.typeAResolver
            )

            return (
              <Fragment fragment={ fragments.TypeA_fieldA } id={ id }>
                { childrens.nil }
              </Fragment>
            )
          } }
        </Query>
      </MockedProvider>
    )

    await sleep()
    wrapper.update()

    expect(childrens.nil.mock).toHaveProperty('calls.2.0.data.fieldA', 'fieldA value')
  })

  it('should provide Fragment children with fragment optimistic result data')
})