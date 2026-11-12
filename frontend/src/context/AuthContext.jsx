import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { refreshSession, setSessionExpiredHandler, tokenStore } from '../api/client'
import { authApi } from '../api/endpoints'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  // Restore the session on page load using the HttpOnly refresh cookie.
  useEffect(() => {
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setInitializing(false))
    setSessionExpiredHandler(() => {
      tokenStore.clear()
      setUser(null)
    })
  }, [])

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials)
    tokenStore.set(data.access)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (values) => {
    const data = await authApi.register(values)
    tokenStore.set(data.access)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      tokenStore.clear()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, setUser }),
    [user, initializing, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
