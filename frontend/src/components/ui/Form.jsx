import { forwardRef, useId, useRef } from 'react'
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import { formatBytes } from '../../utils/format'

const control =
  'block w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50 transition-colors duration-150'
const stateCls = (error) => (error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200/80' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-200/80')

/** Label + control + hint + error, with proper aria wiring. */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-600" aria-hidden>*</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': !!error || undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ label, error, hint, required, className, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <input ref={ref} className={`${control} ${stateCls(error)}`} {...a11y} {...props} />}
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, rows = 4, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <textarea ref={ref} rows={rows} className={`${control} ${stateCls(error)}`} {...a11y} {...props} />}
    </Field>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, required, className, options = [], placeholder = 'Select…', ...props }, ref,
) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => (
        <select ref={ref} className={`${control} ${stateCls(error)}`} {...a11y} {...props}>
          {placeholder !== null && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  )
})

/** Accessible multi-file picker with a removable file list. */
export function FileInput({ label, value = [], onChange, error, hint, max = 3 }) {
  const inputRef = useRef(null)
  const add = (fileList) => {
    const merged = [...value, ...Array.from(fileList)].slice(0, max)
    onChange(merged)
    if (inputRef.current) inputRef.current.value = ''
  }
  return (
    <Field label={label} error={error} hint={hint}>
      {(a11y) => (
        <div>
          <label className={`flex cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-all duration-200 ${error ? 'border-rose-300 bg-rose-50/50' : 'border-slate-300 bg-white hover:border-brand-500 hover:bg-emerald-50/30'}`}>
            <Paperclip className="size-4 text-emerald-600" aria-hidden />
            <span className="text-slate-600">
              <span className="font-semibold text-brand-700">Choose files</span> (JPG, PNG, PDF · up to {max})
            </span>
            <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.pdf" className="sr-only"
              onChange={(e) => add(e.target.files)} disabled={value.length >= max} {...a11y} />
          </label>
          {value.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {value.map((file, i) => (
                <li key={`${file.name}-${i}`} className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2 text-sm shadow-2xs">
                  {file.type === 'application/pdf' ? <FileText className="size-4 text-rose-600" /> : <ImageIcon className="size-4 text-brand-600" />}
                  <span className="flex-1 truncate font-medium text-slate-800">{file.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{formatBytes(file.size)}</span>
                  <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
                    className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer" aria-label={`Remove ${file.name}`}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  )
}
