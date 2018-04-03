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

/**
 * Given an AST, rename fragment arguments to prefix with fragment name.
 * Also rename arguments usage on fields.
 *
 * @param {Object} ast GraphQL AST.
 * @param {Object} [save] object to save the map at.
 * @return {AST} the provided AST with arguments renamed.
 */
export const prefixFragmentArguments = (ast, save) => {
  const renameMap = {}

  // FragmentDefinition visitor.
  const FragmentDefinition = ({ variableDefinitions, ...node }, key, parent, path) => {
    const map = {}
    const mapKey = path.join('.')

    const fragmentName = node.name.value

    // Prefix variable definitions with fragment name.
    variableDefinitions = variableDefinitions.map(def => {
      const variableName = def.variable.name.value
      // Rename and add to map.
      map[variableName] = def.variable.name.value = `${fragmentName}__${variableName}`
      return def
    })

    // Save rename map.
    renameMap[mapKey] = map

    return { ...node, variableDefinitions }
  }

  // Argument visitor.
  const Argument = (node, key, parent, path) => {
    const variableName = node.value.name.value
    const pathString = path.join('.')

    // Find a rename map this argument is scoped into, if any.
    const mapKey = Object.keys(renameMap).find(
      key => pathString.indexOf(key) === 0
    )

    // Necessary rename found?
    if (mapKey && renameMap[mapKey][variableName]) {
      node.value.name.value = renameMap[mapKey][variableName]
      return node
    }
  }

  const result = visit(ast, { FragmentDefinition, Argument })

  // Save the map.
  if (save) {
    Object.keys(renameMap).forEach(
      key => Object.keys(renameMap[key]).forEach(
        name => {
          save[renameMap[key][name]] = name
        }
      )
    )
  }

  return result
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
    Name: ({ value: fragment }, key, parent) => {
      if (parent.kind === 'FragmentSpread') {
        fragmentNames.push(fragment)
      }
    }
  })

  return fragmentNames
}
