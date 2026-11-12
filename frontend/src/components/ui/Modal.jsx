import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'
import { Textarea } from './Form'

/** Accessible modal using the native <dialog> element (focus trap + Esc handled by the browser). */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size]
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose() }}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl border border-slate-200/80 p-0 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs overflow-hidden`}>
      {open && (
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <h2 id={titleId} className="font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer" aria-label="Close dialog">
              <X className="size-5" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

/** Confirmation dialog for consequential actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'primary', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }>
      <div className="flex gap-3">
        <AlertTriangle className={`size-5 shrink-0 ${variant === 'danger' ? 'text-red-600' : 'text-amber-500'}`} aria-hidden />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </Modal>
  )
}

/** Dialog that collects a required/optional text reason before confirming. */
export function ReasonDialog({ open, onClose, onSubmit, title, label, description, confirmLabel = 'Submit', minLength = 10, required = true, variant = 'primary', loading }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setText(''); setError('') }
  }, [open])

  const submit = () => {
    if ((required || text.trim()) && text.trim().length < minLength) {
      setError(`Please enter at least ${minLength} characters.`)
      return
    }
    onSubmit(text.trim())
  }
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant={variant} onClick={submit} loading={loading}>{confirmLabel}</Button>
        </>
      }>
      {description && <p className="mb-3 text-sm text-slate-600">{description}</p>}
      <Textarea label={label} value={text} onChange={(e) => setText(e.target.value)} error={error} required={required} rows={4} maxLength={2000} />
    </Modal>
  )
}
