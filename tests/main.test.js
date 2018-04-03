import React from 'react'
import { mount } from 'enzyme'
import { concatAST } from 'graphql'
import { default as originalGql } from 'graphql-tag'
import { addTypenameToDocument } from 'apollo-utilities'
import console from 'console-suppress'

import { MockedProvider } from '../local_modules/react-apollo/test-utils'

import { Fragment, Query } from 'react-apollo-fragments'
import { ERRORS } from 'react-apollo-fragments/Fragment'

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
  FieldTypeA_on_TypeB: gql`fragment FieldTypeA_on_TypeB on TypeB { fieldTypeA { id ...FieldA_on_TypeA } }`,

  // TypeC
  FieldTypeA_on_FieldTypeB_on_TypeC: gql`fragment FieldTypeA_on_FieldTypeB_on_TypeC on TypeC {
    fieldTypeB { id ...FieldTypeA_on_TypeB }
  }`,
}

const defragmentedFragments = {
  FieldTypeA_on_TypeB: concatAST([
    fragments.FieldTypeA_on_TypeB,
    fragments.FieldA_on_TypeA
  ]),

  FieldTypeA_on_FieldTypeB_on_TypeC: concatAST([
    fragments.FieldTypeA_on_FieldTypeB_on_TypeC,
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

  // TypeB
  TypeC_fieldTypeB_fieldTypeA: gql`query TypeC_fieldTypeB_fieldTypeA { typeCResolver { id ...FieldTypeA_on_FieldTypeB_on_TypeC } }`,
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
  ]),

  // TypeC
  TypeC_fieldTypeB_fieldTypeA: concatAST([
    queries.TypeC_fieldTypeB_fieldTypeA,
    defragmentedFragments.FieldTypeA_on_FieldTypeB_on_TypeC,
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
    __typename: 'TypeB'
  } } }
}]

// TypeC
mocks.TypeC_fieldTypeB_fieldTypeA = [{
  request: { query: defragmentedQueries.TypeC_fieldTypeB_fieldTypeA },
  result: { data: { typeCResolver: {
    id: '1',
    fieldTypeB: mocks.TypeB_fieldTypeA[0].result.data.typeBResolver,
    __typename: 'TypeC'
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
  beforeEach(originalGql.resetCaches)
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

  describe('nested fragments', () => {
    it('should add a nested fragment to a parent query', async () => {
      console.error.suppress(
        'You are using the simple',
        'heuristic fragment matching going on'
      )

      const wrapper = mount(wrapInQuery(
        <Fragment fragment={ fragments.FieldTypeA_on_TypeB }>
          { () => (
            <Fragment fragment={ fragments.FieldA_on_TypeA }>
              { childrens.nil }
            </Fragment>
          ) }
        </Fragment>,
        'TypeB_fieldTypeA'
      ))

      await sleep()
      wrapper.update()

      expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
      expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeBResolver.fieldTypeA.fieldA', 'fieldA value')
    })

    it('should provide nested Fragment children with query result object', async () => {
      console.error.suppress(
        'You are using the simple',
        'heuristic fragment matching going on'
      )

      const children = jest.fn(() => (
        <Fragment fragment={ fragments.FieldA_on_TypeA }>
          { childrens.nil }
        </Fragment>
      ))

      const wrapper = mount(wrapInQuery(
        <Fragment fragment={ fragments.FieldTypeA_on_TypeB }>
          { children }
        </Fragment>,
        'TypeB_fieldTypeA'
      ))

      await sleep()
      wrapper.update()

      expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)

      expect(children.mock).toHaveProperty('calls.0.0.loading', true)
      expect(children.mock).toHaveProperty('calls.1.0.loading', true)
      expect(children.mock).toHaveProperty('calls.2.0.loading', false)

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
        expect(children.mock).toHaveProperty(`calls.2.0.${key}`)
        expect(childrens.nil.mock).toHaveProperty(`calls.2.0.${key}`)
      })
    })

    it('should provide nested Fragment children with fragment result data when id is available', async () => {
      console.error.suppress(
        'You are using the simple',
        'heuristic fragment matching going on'
      )

      const children = jest.fn(({ data, client }) => {
        const id = data.fieldTypeA && client.cache.config.dataIdFromObject(
          data.fieldTypeA
        )

        return (
          <Fragment fragment={ fragments.FieldA_on_TypeA } id={ id }>
            { childrens.nil }
          </Fragment>
        )
      })

      const wrapper = mount(
        <MockedProvider mocks={ mocks.TypeB_fieldTypeA } removeTypename>
          <Query query={ queries.TypeB_fieldTypeA }>
            { ({ data, client }) => {
              const id = data.typeBResolver && client.cache.config.dataIdFromObject(
                data.typeBResolver
              )

              return (
                <Fragment fragment={ fragments.FieldTypeA_on_TypeB } id={ id }>
                  { children }
                </Fragment>
              )
            } }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      // Parent fragment.
      expect(children.mock).toHaveProperty('calls.2.0.loading', false)
      expect(children.mock).toHaveProperty('calls.2.0.data.fieldTypeA.fieldA', 'fieldA value')

      // Nested fragment.
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.data.fieldA', 'fieldA value')
    })

    describe('nested nested fragments', () => {
      it('should add a nested nested fragment to a parent query', async () => {
        console.error.suppress(
          'You are using the simple',
          'heuristic fragment matching going on'
        )

        const wrapper = mount(wrapInQuery(
          <Fragment fragment={ fragments.FieldTypeA_on_FieldTypeB_on_TypeC }>
            { () => (
              <Fragment fragment={ fragments.FieldTypeA_on_TypeB }>
                { () => (
                  <Fragment fragment={ fragments.FieldA_on_TypeA }>
                    { childrens.nil }
                  </Fragment>
                ) }
              </Fragment>
            ) }
          </Fragment>,
          'TypeC_fieldTypeB_fieldTypeA'
        ))

        await sleep()
        wrapper.update()

        expect(wrappedListener.mock).toHaveProperty('calls.0.0.loading', true)
        expect(wrappedListener.mock).toHaveProperty('calls.1.0.loading', true)
        expect(wrappedListener.mock).toHaveProperty('calls.2.0.loading', false)
        expect(wrappedListener.mock).toHaveProperty('calls.2.0.error', undefined)
        expect(wrappedListener.mock).toHaveProperty('calls.2.0.data.typeCResolver.fieldTypeB.fieldTypeA.fieldA', 'fieldA value')
      })

      it('should provide nested nested Fragment children with query result object', async () => {
        console.error.suppress(
          'You are using the simple',
          'heuristic fragment matching going on'
        )

        const fragmentChildrens = {}

        fragmentChildrens.first = jest.fn(() => (
          <Fragment fragment={ fragments.FieldTypeA_on_FieldTypeB_on_TypeC }>
            { fragmentChildrens.second }
          </Fragment>
        ))

        fragmentChildrens.second = jest.fn(() => (
          <Fragment fragment={ fragments.FieldTypeA_on_TypeB }>
            { fragmentChildrens.third }
          </Fragment>
        ))

        fragmentChildrens.third = jest.fn(() => (
          <Fragment fragment={ fragments.FieldA_on_TypeA }>
            { childrens.nil }
          </Fragment>
        ))

        const wrapper = mount(
          <MockedProvider mocks={ mocks.TypeC_fieldTypeB_fieldTypeA } removeTypename>
            <Query query={ queries.TypeC_fieldTypeB_fieldTypeA }>
              { fragmentChildrens.first }
            </Query>
          </MockedProvider>
        )

        await sleep()
        wrapper.update()

        expect(fragmentChildrens.second.mock).toHaveProperty('calls.0.0.loading', true)
        expect(fragmentChildrens.second.mock).toHaveProperty('calls.1.0.loading', true)
        expect(fragmentChildrens.second.mock).toHaveProperty('calls.2.0.loading', false)

        expect(fragmentChildrens.third.mock).toHaveProperty('calls.0.0.loading', true)
        expect(fragmentChildrens.third.mock).toHaveProperty('calls.1.0.loading', true)
        expect(fragmentChildrens.third.mock).toHaveProperty('calls.2.0.loading', false)

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
          expect(fragmentChildrens.second.mock).toHaveProperty(`calls.2.0.${key}`)
          expect(fragmentChildrens.third.mock).toHaveProperty(`calls.2.0.${key}`)
        })
      })

      it('should provide nested nested Fragment children with fragment result data when id is available', async () => {
        console.error.suppress(
          'You are using the simple',
          'heuristic fragment matching going on'
        )

        console.error.suppress(
          'You are using the simple',
          'heuristic fragment matching going on'
        )

        const fragmentChildrens = {}

        fragmentChildrens.first = jest.fn(({ data, client }) => {
          const id = data.typeCResolver && client.cache.config.dataIdFromObject(
            data.typeCResolver
          )

          return (
            <Fragment id={ id } fragment={ fragments.FieldTypeA_on_FieldTypeB_on_TypeC }>
              { fragmentChildrens.second }
            </Fragment>
          )
        })

        fragmentChildrens.second = jest.fn(({ data, client }) => {
          const id = data.fieldTypeB && client.cache.config.dataIdFromObject(
            data.fieldTypeB
          )

          return (
            <Fragment id={ id } fragment={ fragments.FieldTypeA_on_TypeB }>
              { fragmentChildrens.third }
            </Fragment>
          )
        })

        fragmentChildrens.third = jest.fn(({ data, client }) => {
          const id = data.fieldTypeA && client.cache.config.dataIdFromObject(
            data.fieldTypeA
          )

          return (
            <Fragment id={ id } fragment={ fragments.FieldA_on_TypeA }>
              { childrens.nil }
            </Fragment>
          )
        })

        const wrapper = mount(
          <MockedProvider mocks={ mocks.TypeC_fieldTypeB_fieldTypeA } removeTypename>
            <Query query={ queries.TypeC_fieldTypeB_fieldTypeA }>
              { fragmentChildrens.first }
            </Query>
          </MockedProvider>
        )

        await sleep()
        wrapper.update()

        await sleep()
        wrapper.update()

        await sleep()
        wrapper.update()

        // Query data.
        expect(fragmentChildrens.first.mock).toHaveProperty('calls.2.0.loading', false)
        expect(fragmentChildrens.first.mock).toHaveProperty('calls.2.0.data.typeCResolver.fieldTypeB.fieldTypeA.fieldA', 'fieldA value')

        // First fragment data.
        expect(fragmentChildrens.second.mock).toHaveProperty('calls.2.0.loading', false)
        expect(fragmentChildrens.second.mock).toHaveProperty('calls.2.0.data.fieldTypeB.fieldTypeA.fieldA', 'fieldA value')

        // Second fragment data.
        expect(fragmentChildrens.third.mock).toHaveProperty('calls.2.0.loading', false)
        expect(fragmentChildrens.third.mock).toHaveProperty('calls.2.0.data.fieldTypeA.fieldA', 'fieldA value')

        // Third fragment data.
        expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
        expect(childrens.nil.mock).toHaveProperty('calls.2.0.data.fieldA', 'fieldA value')
      })
    })
  })

  describe('fragment arguments', () => {
    it('should hoist arguments from fragment to query', async () => {
      const query = gql`
        query {
          typeResolver {
            ...A
          }
        }
      `

      const fragment = gql`
        fragment A ($argument: String!) on Type {
          field (argument: $argument)
        }
      `

      const defragmentedQuery = gql`
        query ($A__argument: String!) {
          typeResolver {
            ...A
          }
        }

        fragment A on Type {
          field (argument: $A__argument)
        }
      `

      const mock = {
        request: { query: defragmentedQuery },
        result: { data: { typeResolver: { field: 'value', __typename: 'Type' } } }
      }

      const wrapper = mount(
        <MockedProvider mocks={ [mock] }>
          <Query query={ query }>
            { () => (
              <Fragment fragment={ fragment }>
                { childrens.nil }
              </Fragment>
            ) }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.queryData.typeResolver.field', 'value')
    })

    it('should hoist variables values from Fragment to Query component', async () => {
      const query = gql`
        query {
          typeResolver {
            ...A
          }
        }
      `

      const fragment = gql`
        fragment A ($argument: String!) on Type {
          field (argument: $argument)
        }
      `

      const defragmentedQuery = gql`
        query ($A__argument: String!) {
          typeResolver {
            ...A
          }
        }

        fragment A on Type {
          field (argument: $A__argument)
        }
      `

      const mock = {
        request: { query: defragmentedQuery, variables: { A__argument: 'value' } },
        result: { data: { typeResolver: { field: 'value', __typename: 'Type' } } }
      }

      const wrapper = mount(
        <MockedProvider mocks={ [mock] }>
          <Query query={ query }>
            { () => (
              <Fragment fragment={ fragment } variables={ { argument: 'value' } }>
                { childrens.nil }
              </Fragment>
            ) }
          </Query>
        </MockedProvider>
      )

      await sleep()
      wrapper.update()

      expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.queryData.typeResolver.field', 'value')
    })

    it('should refetch on hoisted variables values change', async () => {
      const query = gql`
        query {
          typeResolver {
            ...A
          }
        }
      `

      const fragment = gql`
        fragment A ($argument: String!) on Type {
          field (argument: $argument)
        }
      `

      const defragmentedQuery = gql`
        query ($A__argument: String!) {
          typeResolver {
            ...A
          }
        }

        fragment A on Type {
          field (argument: $A__argument)
        }
      `

      const mocks = [
        {
          request: { query: defragmentedQuery, variables: { A__argument: 'initial' } },
          result: { data: { typeResolver: { field: 'value', __typename: 'Type' } } }
        },
        {
          request: { query: defragmentedQuery, variables: { A__argument: 'updated' } },
          result: { data: { typeResolver: { field: 'new value', __typename: 'Type' } } }
        }
      ]

      class StateChanger extends React.Component {
        constructor (props) {
          super(props)
          this.state = { argument: 'initial' }
        }

        render () {
          return (
            <MockedProvider mocks={ mocks }>
              <Query query={ query }>
                { () => (
                  <Fragment fragment={ fragment } variables={ this.state }>
                    { childrens.nil }
                  </Fragment>
                ) }
              </Query>
            </MockedProvider>
          )
        }
      }

      const wrapper = mount(<StateChanger />)

      await sleep()
      wrapper.update()

      expect(childrens.nil.mock.calls.length).toBe(3)
      expect(childrens.nil.mock).toHaveProperty('calls.0.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.1.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.error', undefined)
      expect(childrens.nil.mock).toHaveProperty('calls.2.0.queryData.typeResolver.field', 'value')

      wrapper.setState({ argument: 'updated' })

      expect(childrens.nil.mock.calls.length).toBe(5)
      expect(childrens.nil.mock).toHaveProperty('calls.3.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.4.0.loading', true)
      expect(childrens.nil.mock).toHaveProperty('calls.4.0.error', undefined)

      await sleep()
      wrapper.update()

      expect(childrens.nil.mock.calls.length).toBe(6)
      expect(childrens.nil.mock).toHaveProperty('calls.5.0.loading', false)
      expect(childrens.nil.mock).toHaveProperty('calls.5.0.error', undefined)
      expect(childrens.nil.mock).toHaveProperty('calls.5.0.queryData.typeResolver.field', 'new value')
    })
  })
})
