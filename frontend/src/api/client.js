/**
 * Axios client with secure token handling.
 *
 *  - The ACCESS token is kept only in this module's memory (never localStorage/sessionStorage),
 *    so it disappears when the tab closes and cannot be stolen from storage by XSS.
 *  - The REFRESH token is an HttpOnly cookie set by the backend; JavaScript never sees it.
 *  - On a 401, the client refreshes once (single-flight, shared by concurrent requests)
 *    and retries the original request.
 */
import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const COMMON = {
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
}

// Calls that must never trigger a refresh-and-retry loop.
const SESSION_ENDPOINTS = ['/auth/login/', '/auth/register/', '/auth/refresh/', '/auth/logout/']

let accessToken = null
let refreshPromise = null
let onSessionExpired = () => {}

export const tokenStore = {
  get: () => accessToken,
  set: (token) => { accessToken = token },
  clear: () => { accessToken = null },
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler
}

const client = axios.create({ ...COMMON, timeout: 60000 })
// Separate instance without interceptors for the refresh call itself.
const authClient = axios.create({ ...COMMON, timeout: 60000 })

/** Exchange the HttpOnly refresh cookie for a new access token. Returns { access, user }. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post('/auth/refresh/')
      .then(({ status, data }) => {
        // 204 = no session cookie (visitor is simply not logged in), or HTML returned on error
        if (status === 204 || typeof data === 'string' || !data?.access) throw new Error('No active session')
        accessToken = data.access
        return data
      })
      .catch((err) => {
        accessToken = null
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

client.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string' && response.data.trim().startsWith('<!doctype')) {
      return Promise.reject(new Error('Backend API returned HTML instead of JSON. Check backend connection.'))
    }
    return response
  },
  async (error) => {
    const original = error.config
    const isAuthCall = SESSION_ENDPOINTS.includes(original?.url)
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      try {
        await refreshSession()
        original.headers.Authorization = `Bearer ${accessToken}`
        return client(original)
      } catch {
        onSessionExpired()
      }
    }
    return Promise.reject(error)
  },
)

export default client
