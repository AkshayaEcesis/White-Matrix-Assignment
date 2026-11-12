import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { publicApi } from '../api/endpoints'

/** Dropdown choices (districts, categories, statuses, priorities) and departments, loaded once from the API. */
const MetaContext = createContext(null)
const EMPTY = { districts: [], categories: [], statuses: [], priorities: [] }

export function MetaProvider({ children }) {
  const [choices, setChoices] = useState(EMPTY)
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([publicApi.choices(), publicApi.departments()])
      .then(([c, d]) => {
        setChoices(c)
        setDepartments(d)
      })
      .catch(() => setError('Could not load reference data from the server.'))
  }, [])

  const value = useMemo(() => {
    const labelOf = (list) => Object.fromEntries(list.map((o) => [o.value, o.label]))
    return {
      ...choices,
      departments,
      error,
      labels: {
        district: labelOf(choices.districts),
        category: labelOf(choices.categories),
        status: labelOf(choices.statuses),
        priority: labelOf(choices.priorities),
      },
    }
  }, [choices, departments, error])

  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeta() {
  return useContext(MetaContext)
}
