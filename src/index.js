
import walk from 'react-tree-walker'

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
