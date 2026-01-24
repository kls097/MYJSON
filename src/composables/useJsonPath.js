// JSONPath and JMESPath query composable
import { JSONPath } from 'jsonpath-plus'
import jmespath from 'jmespath'

export function useJsonPath() {
  const queryJson = (json, query, syntax = 'jsonpath') => {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json

      if (syntax === 'jsonpath') {
        return JSONPath({ path: query, json: data, wrap: false })
      } else if (syntax === 'jmespath') {
        return jmespath.search(data, query)
      }

      throw new Error('Unknown syntax type')
    } catch (error) {
      throw new Error(`Query error: ${error.message}`)
    }
  }

  return { queryJson }
}
