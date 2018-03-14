
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

    if (fragment) fragments.push(fragment)

    return dive(fragment, element, ...args)
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
