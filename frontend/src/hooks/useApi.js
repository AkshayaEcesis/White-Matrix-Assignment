import { useCallback, useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../utils/errors'

/**
 * Loads data from an async function and exposes { data, loading, error, reload, setData }.
 * Responses from superseded requests are ignored (no race conditions when params change).
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const requestId = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async () => {
    const id = ++requestId.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetcher()
      if (id === requestId.current) setState({ data, loading: false, error: null })
    } catch (err) {
      if (id === requestId.current) setState({ data: null, loading: false, error: getErrorMessage(err) })
    }
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
  }, [])

  return { ...state, reload: load, setData }
}
