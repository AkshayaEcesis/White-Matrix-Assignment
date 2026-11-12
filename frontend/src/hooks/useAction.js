import { useCallback, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../utils/errors'

/** Wraps a mutating API call with a pending flag and success/error toasts. */
export function useAction() {
  const toast = useToast()
  const [pending, setPending] = useState(false)

  const run = useCallback(
    async (fn, { success, onSuccess, onError } = {}) => {
      setPending(true)
      try {
        const result = await fn()
        if (success) toast.success(success)
        onSuccess?.(result)
        return result
      } catch (err) {
        if (!onError?.(err)) toast.error(getErrorMessage(err))
        return undefined
      } finally {
        setPending(false)
      }
    },
    [toast],
  )

  return { run, pending }
}
