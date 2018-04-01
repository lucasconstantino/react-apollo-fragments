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

// Testing children render prop implementations.
const childrens = {}
childrens.nil = jest.fn(() => null)
childrens.div = jest.fn(() => <div>content</div>)

// Testing fragment documents.
const fragments = {
  // TypeA
  FieldA_on_TypeA: gql`fragment FieldA_on_TypeA on TypeA { fieldA }`,
  FieldB_on_TypeA: gql`fragment FieldB_on_TypeA on TypeA { fieldB }`,

  // TypeB
  FieldA_on_TypeB: gql`fragment FieldA_on_TypeB on TypeB { fieldA }`,
  FieldTypeA_on_TypeB: gql`fragment FieldTypeA_on_TypeB on TypeB { fieldTypeA { id ...FieldA_on_TypeA } }`
}

const defragmentedFragments = {
  FieldTypeA_on_TypeB: concatAST([
    fragments.FieldTypeA_on_TypeB,
    fragments.FieldA_on_TypeA
  ])
}

// Testing query documents.
const queries = {
  // Misc
  noFragment: gql`query NoFragment { rootField }`,

  // TypeA
  TypeA_fieldA: gql`query TypeA_fieldA { typeAResolver { id ...FieldA_on_TypeA } }`,
  TypeA_fieldA_fieldB: gql`query TypeA_fieldA_fieldB { typeAResolver { id ...FieldA_on_TypeA ...FieldB_on_TypeA } }`,

  // TypeB
  TypeB_fieldA: gql`query TypeB_fieldA { typeBResolver { id ...FieldA_on_TypeB } }`,
  TypeB_fieldTypeA: gql`query TypeB_fieldTypeA { typeBResolver { id ...FieldTypeA_on_TypeB } }`,
}

const defragmentedQueries = {
  // TypeA
  TypeA_fieldA: concatAST([
    queries.TypeA_fieldA,
    fragments.FieldA_on_TypeA
  ]),

  TypeA_fieldA_fieldB: concatAST([
    queries.TypeA_fieldA_fieldB,
    fragments.FieldA_on_TypeA,
    fragments.FieldB_on_TypeA
  ]),

  // TypeB
  TypeB_fieldA: concatAST([
    queries.TypeB_fieldA,
    fragments.FieldA_on_TypeB
  ]),

  TypeB_fieldTypeA: concatAST([
    queries.TypeB_fieldTypeA,
    defragmentedFragments.FieldTypeA_on_TypeB
  ])
}

const mocks = {}

// Misc
mocks.noFragment = [{
  request: { query: queries.noFragment },
  result: { data: { rootField: 'rootField value' } }
}]

// TypeA
mocks.TypeA_fieldA = [{
  request: { query: defragmentedQueries.TypeA_fieldA },
  result: { data: { typeAResolver: { id: '1', fieldA: 'fieldA value', __typename: 'TypeA' } } }
}]

mocks.TypeA_fieldA_fieldB = [{
  request: { query: defragmentedQueries.TypeA_fieldA_fieldB },
  result: { data: { typeAResolver: { id: '2', fieldA: 'fieldA value', fieldB: 'fieldB value', __typename: 'TypeA' } } }
}]

// TypeB
mocks.TypeB_fieldA = [{
  request: { query: defragmentedQueries.TypeB_fieldA },
  result: { data: { typeAResolver: { id: '1', fieldA: 'fieldA value', __typename: 'TypeA' } } }
}]

mocks.TypeB_fieldTypeA = [{
  request: { query: defragmentedQueries.TypeB_fieldTypeA },
  result: { data: { typeBResolver: {
    id: '1',
    fieldTypeA: mocks.TypeA_fieldA[0].result.data.typeAResolver,
    __typename: 'TypeA'
  } } }
}]

const wrappedListener = jest.fn()

const wrapInQuery = (element, queryName = 'TypeA_fieldA') => (
  <MockedProvider mocks={ mocks[queryName] } removeTypename>
    <Query query={ queries[queryName] }>
      { wrappedListener.mockReturnValue(element) }
    </Query>
  </MockedProvider>
)

describe('Fragment', () => {
  beforeEach(jest.clearAllMocks)
  beforeEach(console.cleanSuppressors)

  it('should render children', () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.FieldA_on_TypeA }>{ childrens.div }</Fragment>
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

    expect(() => mount(<Fragment fragment={ fragments.FieldA_on_TypeA }>{ childrens.nil }</Fragment>))
      .toThrow(ERRORS.NO_PARENT_QUERY)
  })

  it('should add a fragment to a parent query', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.FieldA_on_TypeA }>{ childrens.nil }</Fragment>
    ))

    await sleep()
    wrapper.update()

    expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.error', undefined)
    expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')
  })

  it('should provide Fragment children with query result object', async () => {
    const wrapper = mount(wrapInQuery(
      <Fragment fragment={ fragments.FieldA_on_TypeA }>
        { childrens.nil }
      </Fragment>
    ))

    await sleep()
    wrapper.update()

    expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
    expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
    expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)

    const resultKeys = [
      'data',
      'queryData',

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
      <MockedProvider mocks={ mocks.TypeA_fieldA } removeTypename>
        <Query query={ queries.TypeA_fieldA }>
          { ({ data, client }) => {
            const id = data.typeAResolver && client.cache.config.dataIdFromObject(
              data.typeAResolver
            )

            return (
              <Fragment fragment={ fragments.FieldA_on_TypeA } id={ id }>
                { childrens.nil }
              </Fragment>
            )
          } }
        </Query>
      </MockedProvider>
    )

    await sleep()
    wrapper.update()

    expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
    expect(childrens.nil.mock).toHaveProperty('calls.2.0.data.fieldA', 'fieldA value')
  })

  it('should provide Fragment children with fragment optimistic result data')

  describe('multiple fragments', () => {
    it('should add multiple fragments to a parent query', async () => {
      const wrapper = mount(wrapInQuery(
        <div>
          <Fragment fragment={ fragments.FieldA_on_TypeA }>{ childrens.nil }</Fragment>
          <Fragment fragment={ fragments.FieldB_on_TypeA }>{ childrens.nil }</Fragment>
        </div>,
        'TypeA_fieldA_fieldB'
      ))

      await sleep()
      wrapper.update()

      expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
      expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldB', 'fieldB value')
    })

    it('should provide multiple Fragments with their fragment result data when ids are available', async () => {
      const childrens = {
        a: jest.fn(() => null),
        b: jest.fn(() => null),
      }

      const wrapper = mount(
        <MockedProvider mocks={ mocks.TypeA_fieldA_fieldB } removeTypename>
          <Query query={ queries.TypeA_fieldA_fieldB }>
            { ({ data, client }) => {
              const id = data.typeAResolver && client.cache.config.dataIdFromObject(
                data.typeAResolver
              )

              return (
                <div>
                  <Fragment fragment={ fragments.FieldA_on_TypeA } id={ id }>
                    { childrens.a }
                  </Fragment>

                  <Fragment fragment={ fragments.FieldB_on_TypeA } id={ id }>
                    { childrens.b }
                  </Fragment>
                </div>
              )
            } }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      expect(childrens.a.mock).toHaveProperty('calls.2.0.data.fieldA', 'fieldA value')
      expect(childrens.b.mock).toHaveProperty('calls.2.0.data.fieldB', 'fieldB value')
    })
  })

  describe('nested queries', () => {
    it('should add a fragment only to the belonging query', async () => {
      const children = jest.fn(result => (
        <Query query={ queries.noFragment }>
          { resultNoFragment => (
            <Fragment fragment={ fragments.FieldA_on_TypeA }>
              { childrens.nil }
            </Fragment>
          ) }
        </Query>
      ))

      const wrapper = mount(
        <MockedProvider mocks={ [].concat(mocks.TypeA_fieldA, mocks.TypeB_fieldA) } removeTypename>
          <Query query={ queries.TypeA_fieldA }>
            { children }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      expect(children.mock).toHaveProperty('calls.0.0.loading', true)
      expect(children.mock).toHaveProperty('calls.1.0.loading', true)
      expect(children.mock).toHaveProperty('calls.2.0.loading', false)
      expect(children.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(children.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')
    })

    it('should add a fragment only to the nearest belonging query', async () => {
      const children = {}

      children.a = jest.fn(() => (
        <div>
          <Fragment fragment={ fragments.FieldA_on_TypeA }>
            { childrens.nil }
          </Fragment>

          <Fragment fragment={ fragments.FieldB_on_TypeA }>
            { childrens.nil }
          </Fragment>

          <Query query={ queries.TypeA_fieldA }>
            { children.b }
          </Query>
        </div>
      ))

      children.b = jest.fn(() => (
        <Fragment fragment={ fragments.FieldA_on_TypeA }>
          { childrens.nil }
        </Fragment>
      ))

      const results = [].concat(
        mocks.TypeA_fieldA,
        mocks.TypeA_fieldA_fieldB,
      )

      const wrapper = mount(
        <MockedProvider mocks={ results } removeTypename>
          <Query query={ queries.TypeA_fieldA_fieldB }>
            { children.a }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      expect(children.a.mock).toHaveProperty('calls.0.0.loading', true)
      expect(children.a.mock).toHaveProperty('calls.1.0.loading', true)
      expect(children.a.mock).toHaveProperty('calls.2.0.loading', false)
      expect(children.a.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(children.a.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')
      expect(children.a.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldB', 'fieldB value')

      expect(children.b.mock).toHaveProperty('calls.0.0.loading', true)
      expect(children.b.mock).toHaveProperty('calls.1.0.loading', true)
      expect(children.b.mock).toHaveProperty('calls.2.0.loading', true)
      expect(children.b.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(children.b.mock).toHaveProperty('calls.2.0.data.typeAResolver.fieldA', 'fieldA value')

      // Additional render because of the forced state rerender of the parent query
      // componente. Data was already on store, so available since previous run.
      expect(children.b.mock).toHaveProperty('calls.3.0.loading', false)
      expect(children.b.mock).toHaveProperty('calls.3.0.error', undefined)
      expect(children.b.mock).toHaveProperty('calls.3.0.data.typeAResolver.fieldA', 'fieldA value')
    })
  })
})
