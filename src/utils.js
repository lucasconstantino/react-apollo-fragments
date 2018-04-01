import { visit, BREAK } from 'graphql'

export const unique = (v, i, arr) => arr.indexOf(v) === i

/**
 * Given an AST, extract the first available fragment name.
 *
 * @param {Object} ast GraphQL AST.
 * @return {String} the found fragment name or null otherwise.
 */
export const getFragmentName = ast => {
  let fragmentName = null

  visit(ast, {
    FragmentDefinition: ({ name: { value } }) => {
      fragmentName = value
      return BREAK
    }
  })

  return fragmentName
}

/**
 * Given an AST, extract the first available fragment names.
 *
 * @param {Object} ast GraphQL AST.
 * @return {[String]} the found fragment names or empty array if none.
 */
export const getFragmentNames = ast => {
  const fragmentNames = []

  visit(ast, {
    FragmentDefinition: ({ name: { value } }) => {
      fragmentNames.push(value)
      return false
    }
  })

  return fragmentNames
}

/**
 * Given an AST, extract the name of all requested fragments.
 *
 * @param {Object} ast GraphQL AST.
 * @return {[String]} an array with the name of all used fragments.
 */
export const getRequestedFragmentNames = ast => {
  const fragmentNames = []

  visit(ast, {
    // FragmentSpread:
    Name: ({ value: fragment }, key, parent, path, ancestors) => {
      if (parent.kind === 'FragmentSpread') {
        fragmentNames.push(fragment)
      }
    }
  })

  return fragmentNames
}
