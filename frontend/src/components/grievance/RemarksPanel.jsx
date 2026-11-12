import { useState } from 'react'
import { Eye, Lock, MessageSquarePlus } from 'lucide-react'
import { useAction } from '../../hooks/useAction'
import { timeAgo } from '../../utils/format'
import { Badge } from '../ui/Badge'
import Button from '../ui/Button'
import { Textarea } from '../ui/Form'

/** Remarks list with an optional add form. Staff can choose internal vs public visibility. */
export default function RemarksPanel({ remarks = [], onAdd, allowVisibility = false, emptyText = 'No remarks yet.' }) {
  const [text, setText] = useState('')
  const [visibility, setVisibility] = useState('INTERNAL')
  const [error, setError] = useState('')
  const { run, pending } = useAction()

  const submit = async (e) => {
    e.preventDefault()
    if (text.trim().length < 3) return setError('Remark must be at least 3 characters.')
    setError('')
    await run(() => onAdd({ text: text.trim(), visibility }), {
      success: 'Remark added.',
      onSuccess: () => setText(''),
    })
  }

  return (
    <div className="space-y-4">
      {onAdd && (
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
          <Textarea label="Add an official remark" value={text} onChange={(e) => setText(e.target.value)} rows={3} error={error} maxLength={2000} />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {allowVisibility ? (
              <fieldset className="flex gap-4 text-xs font-medium text-slate-700">
                <legend className="sr-only">Remark visibility</legend>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="visibility" value="INTERNAL" checked={visibility === 'INTERNAL'} onChange={() => setVisibility('INTERNAL')} className="accent-brand-700" />
                  Internal (staff only)
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="visibility" value="PUBLIC" checked={visibility === 'PUBLIC'} onChange={() => setVisibility('PUBLIC')} className="accent-brand-700" />
                  Visible to citizen
                </label>
              </fieldset>
            ) : <span />}
            <Button type="submit" size="sm" icon={MessageSquarePlus} loading={pending}>Add remark</Button>
          </div>
        </form>
      )}
      {remarks.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {remarks.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {r.author.full_name}
                  {r.author.full_name !== r.author.role_label && <span className="font-normal text-slate-500"> · {r.author.role_label}</span>}
                </p>
                <div className="flex items-center gap-2">
                  {allowVisibility && (r.visibility === 'PUBLIC'
                    ? <Badge icon={Eye} className="bg-sky-50 text-sky-700 ring-sky-200">Public</Badge>
                    : <Badge icon={Lock} className="bg-slate-50 text-slate-600 ring-slate-200">Internal</Badge>)}
                  <span className="text-xs text-slate-500">{timeAgo(r.created_at)}</span>
                </div>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
