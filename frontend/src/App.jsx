import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { MetaProvider } from './context/MetaContext'
import { ToastProvider } from './context/ToastContext'
import AppRoutes from './routes/AppRoutes'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <MetaProvider>
            <ScrollToTop />
            <AppRoutes />
          </MetaProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
