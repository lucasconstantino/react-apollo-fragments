
import walk from 'react-tree-walker'
import { visit, BREAK } from 'graphql'

/**
 * Asynchronously walk a React component tree to extract
 * any encountered fragments (via static properties on components).
 *
 * @param {Object} tree A React component tree.
 * @param {Function} dive Predicate function to decide if should dive deeper.
 * @param {Object} dive.fragment The extracted fragment.
 * @param dive[...] The walking parameters.
 *
 * @return {Array} extracted fragments.
 */
export const getFragmentsFromTree = async (tree, dive = () => true) => {
  const fragments = []

  await walk(tree, (element, ...args) => {
    const fragment = element.type && element.type.fragment
      ? element.type.fragment
      : null

    const diving = dive(fragment, element, ...args)

    if (fragment && diving) fragments.push(fragment)

    return diving
  })

  return fragments
}

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

