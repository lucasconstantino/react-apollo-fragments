# React Apollo Fragments

True Fragment component for react-apollo

[![Build status](https://travis-ci.org/lucasconstantino/react-apollo-fragments.svg?branch=master)](https://travis-ci.org/lucasconstantino/react-apollo-fragments) [![Greenkeeper badge](https://badges.greenkeeper.io/lucasconstantino/react-apollo-fragments.svg)](https://greenkeeper.io/)

> :warning: **This package is not ready for production, and some functionality depends on a [pull-request to graphql-tag](https://github.com/apollographql/graphql-tag/pull/167#issuecomment-379306245)**

## Installation

```
npm install react-apollo-fragments
```

> react-apollo-fragments has peer dependency on [react](https://github.com/facebook/react), [react-apollo](https://github.com/apollographql/react-apollo), [graphql](https://github.com/graphql/graphql-js), and [prop-types](https://github.com/facebook/prop-types). Make sure to have them installed as well.

## Motivation

When [using fragments](https://www.apollographql.com/docs/react/features/fragments.html) one thing that bothers me is that we lose some of the decoupling between child and parent components. When the fragment is used by a first-level child using fragments be declared in it's parent component is not a big problem; you are already declaring the use of the child component via importing it on the parent, after all. But when the fragment is used way below down the tree, it just becomes odd to have the querying component have so much knowledge on what fragments exactly - and many times sub-fragments - are in use down the rendering tree.

There was already some [discussion on fragment composition](https://github.com/apollographql/react-apollo/issues/140), but the proposals did not went forward.

What I needed was some way to decouple my components once more, avoid having to define too many inner-queries to keep them decouple, and use GraphQL for the task it was meant to be used: walking through a graph.

## How does it work

This project exposes a Fragment component and a substitute [Query component](https://github.com/apollographql/react-apollo/releases/tag/v2.1.0-beta.0). When a Fragment component is rendered down the tree, it will automatically present it's fragment to the parent Query component, which will then update it's query to contain the provided fragment.

The Fragment component is a render prop based component which will provide it's children with the same query result as the Query component provides. You can also provide an `id` prop to Fragment, which will result in that fragment's data being provided as `data` prop on the Fragment's children.

## Usage

Say you have the following type:

```gql
type User {
  id
  name
  surname
  photo
  age
}
```

... and you have an Avatar fragment:

```gql
# ./avatar.gql
fragment Avatar on User {
  name
  photo
}
```

... which is consumed in the following user listing query:

```gql
# ./user-list.gql
query List {
  users {
    id
    ...Avatar
  }
}
```

... then the fragment can be used in a component Avatar as follows:

```js
import { Fragment } from 'react-apollo-fragments'

import avatarFragment from './avatar.gql'

const Avatar = ({ user: { name, photo } }) => (
  <Fragment fragment={ avatarFragment }>
    { () => (
      <div>
        <img src={ photo } alt={ name } />
        <h3>{ name }</h3>
      </div>
    ) }
  </Fragment>
)
```

... and the query can be executed as in:

```js
import { Query } from 'react-apollo-fragments'

import userListQuery from './user-list.gql'
import Avatar from './Avatar'

const Page = () => (
  <div>
    <h1>List of Users</h1>
    <Query query={ userListQuery }>
      { ({ data: { users = [] } }) => (
        <ul>
          { users.map(user => (
            <Avatar key={ user.id } user={ user } />
          )) }
        </ul>
      ) }
    </Query>
  </div>
)
```

... and that's it! No more direct fragment usage on the querying component :)

### Fragment data injection

The Fragment can also be smarter and provide you with the fragment's data. For that to
happen, all you have to do is provide the component with and `id`, which must match
the one retrieve via `getDataIdFromObject`.

The Avatar component could be updated to the following:

```js
import { Fragment } from 'react-apollo-fragments'

import avatarFragment from './avatar.gql'

const Avatar = ({ user }) => (
  <Fragment fragment={ avatarFragment } id={ getDataIdFromObject(user) }>
    { ({ data: { name, photo }, loading }) => (
      <div>
        <img src={ photo } alt={ name } />
        <h3>{ name }</h3>
      </div>
    ) }
  </Fragment>
)
```

## This package should be temporary

I believe what is accomplished by this package should be soon implemented on the [React Apollo](https://github.com/apollographql/react-apollo) core. If someday that happens, this package will either be deprecated or hold other experimental functionality on the subject of GraphQL fragments with Apollo and React.
