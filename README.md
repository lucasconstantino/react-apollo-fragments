# React Apollo Defragment

Automatic query defragmentation based on React trees.

![Build status](https://travis-ci.org/lucasconstantino/react-apollo-defragment.svg?branch=master)

:warning: **This is experimental software**, and though there are plenty of unit tests you should probably avoid using on production code

## Installation

```
npm install react-apollo-defragment
```

> react-apollo-defragment has peer dependency on [react](https://github.com/facebook/react), [react-apollo](https://github.com/apollographql/react-apollo), [graphql](https://github.com/graphql/graphql-js), and [prop-types](https://github.com/facebook/prop-types). Make sure to have them installed.

## Motivation

When [using fragments](https://www.apollographql.com/docs/react/features/fragments.html) one thing that bothers me is that we lose some of the decoupling between child and parent components. When the fragment is used by a first-level child using fragment as we currently do is not a big problem; you are already declaring the use of the child component via importing it on the parent, after all. But when the fragment is used way below down the tree, it just becomes odd to have the querying component have so much logic on what fragments exactly - and many times sub-fragments - must be in use.

There was already some [discussion on fragment composition](https://github.com/apollographql/react-apollo/issues/140), but the proposals did not went forward.

What I needed was some way to decouple my components once more, and avoid having to define too many inner-queries to solve something that GraphQL should be used for: walking through a graph.

## How does it work

This project exposes a substitute [Query component](https://github.com/apollographql/react-apollo/releases/tag/v2.1.0-beta.0) which traverses the underlying React element tree to find the fragments in use in the query. The components must expose fragments on the static property `fragment` for this to work.

## Usage

The usage is the same as with react-apollo's `Query` component, only in this case no fragments must be imported and declared from the component:

```js
import { Query } from 'react-apollo-defragment'
import gql from 'graphql-tag'

// PersonAvatar.js: a component using fragments.

const PersonAvatar = ({ photo, name }) => (
  <div>
    <img src={ photo } alt={ name } />
    <h3>{ name }</h3>
  </div>
)

PersonAvatar.fragment = gql`
  fragment Avatar on Person {
    name
    photo
  }
`

// People.js: a component querying people and displaying avatars.

const query = gql`
  query People {
    people {
      id
      ...Avatar
    }
  }
`

const People = () => (
  <Query>
    { ({ loading, data: { people } }) => (
      !loading && (
        <ul>
          { people.map(person => (
            <li key={ person.id }>
              <PersonAvatar { ...person } />
            </li>
          )) }
        </ul>
      )
    ) }
  </Query>
)
```

## This package should be temporary

I believe something similar to what is accomplished by this package should be soon implemented on the [React Apollo](https://github.com/apollographql/react-apollo) core. If someday that happens, this package will either be deprecated or hold other experimental functionality on the subject of GraphQL fragments with Apollo and React.
