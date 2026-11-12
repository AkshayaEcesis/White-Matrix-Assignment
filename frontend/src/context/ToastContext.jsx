import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, cls: 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-400/20' },
  error: { icon: XCircle, cls: 'border-rose-300 bg-gradient-to-r from-rose-50 to-red-50 text-rose-950 shadow-lg shadow-rose-500/15 ring-1 ring-rose-400/20' },
  warning: { icon: AlertTriangle, cls: 'border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-950 shadow-lg shadow-amber-500/15 ring-1 ring-amber-400/20' },
  info: { icon: Info, cls: 'border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50 text-sky-950 shadow-lg shadow-sky-500/15 ring-1 ring-sky-400/20' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (type, message) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-3), { id, type, message }])
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      warning: (m) => push('warning', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map(({ id, type, message }) => {
          const { icon: Icon, cls } = STYLES[type]
          return (
            <div key={id} role={type === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${cls}`}>
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="flex-1">{message}</p>
              <button onClick={() => dismiss(id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss notification">
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
