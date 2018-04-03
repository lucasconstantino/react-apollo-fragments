import { visit, BREAK } from 'graphql'

export const unique = (v, i, arr) => arr.indexOf(v) === i

/**
 * Given an AST, get the first available fragment name.
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
 * Given an AST, get the first available fragment names.
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
 * Given a fragment AST, extract arguments.
 *
 * @param {Object} ast GraphQL AST.
 * @param {Array} [save] array where to save extracted arguments information.
 * @return {AST} the provided AST without arguments definitions.
 */
export const extractFragmentArguments = (ast, save = []) => visit(ast, {
  FragmentDefinition: node => {
    const { variableDefinitions, ...result } = node
    save.push(...variableDefinitions)
    return result
  }
})


    }
  }

/**
 * Given an AST, get the name of all requested fragments.
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
