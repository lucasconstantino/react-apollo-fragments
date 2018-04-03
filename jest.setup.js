import { disableFragmentWarnings, enableExperimentalFragmentVariables } from 'graphql-tag'

enableExperimentalFragmentVariables()
// Avoid graphql-tag warning on repeated fragment names.
disableFragmentWarnings()
