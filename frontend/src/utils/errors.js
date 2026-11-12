/** Turns an Axios error into a human-readable message. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
    return 'Unable to reach the server. Please check your connection.'
  }
  const { status, data } = error.response
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status === 403 && !data?.detail) return 'You do not have permission to do this.'
  if (status >= 500) return 'The server encountered an error. Please try again later.'
  if (typeof data === 'string') return fallback
  if (data?.detail) return data.detail
  if (Array.isArray(data)) return data.join(' ')
  if (data && typeof data === 'object') {
    const first = Object.values(data)[0]
    if (Array.isArray(first)) return String(first[0])
    if (typeof first === 'string') return first
  }
  return fallback
}

/** Maps DRF field errors onto react-hook-form fields. Returns true if any were applied. */
export function applyFieldErrors(error, setError, fields) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  let applied = false
  Object.entries(data).forEach(([field, messages]) => {
    if (fields.includes(field)) {
      setError(field, { type: 'server', message: Array.isArray(messages) ? messages[0] : String(messages) })
      applied = true
    }
  })
  return applied
}
