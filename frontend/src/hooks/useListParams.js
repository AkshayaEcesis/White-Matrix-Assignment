import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Filters + pagination stored in the URL, so filtered views are shareable and survive refresh. */
export function useListParams(keys) {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => {
    const result = { page: Number(searchParams.get('page')) || 1 }
    keys.forEach((k) => {
      const v = searchParams.get(k)
      if (v) result[k] = v
    })
    return result
  }, [searchParams, keys])

  const setParam = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value === '' || value === null || value === undefined || value === false) next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  const reset = useCallback(() => setSearchParams({}), [setSearchParams])
  return { params, setParam, reset }
}
