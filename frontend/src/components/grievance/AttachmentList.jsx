import { useState } from 'react'
import { Download, FileText, ImageIcon, Loader2 } from 'lucide-react'
import { downloadAttachment } from '../../api/endpoints'
import { useToast } from '../../context/ToastContext'
import { getErrorMessage } from '../../utils/errors'
import { formatBytes, formatDate } from '../../utils/format'

/** Attachments are fetched through the authorised API, never via public file URLs. */
export default function AttachmentList({ attachments = [], emptyText = 'No attachments.' }) {
  const toast = useToast()
  const [busy, setBusy] = useState(null)
  if (!attachments.length) return <p className="text-sm text-slate-500">{emptyText}</p>

  const download = async (a) => {
    setBusy(a.id)
    try {
      await downloadAttachment(a)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not download the file.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="space-y-2">
      {attachments.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 transition-colors hover:border-brand-300 hover:bg-white shadow-2xs">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white border border-slate-200 shadow-2xs">
            {a.content_type === 'application/pdf' ? <FileText className="size-5 text-rose-600" aria-hidden /> : <ImageIcon className="size-5 text-emerald-600" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{a.original_name}</p>
            <p className="text-xs text-slate-500 font-mono">
              {formatBytes(a.size)} · {formatDate(a.created_at)}{a.kind === 'ACTION_REPORT' ? ' · Action report' : ''}
            </p>
          </div>
          <button onClick={() => download(a)} disabled={busy === a.id}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-2xs hover:bg-emerald-50 hover:border-brand-300 disabled:opacity-50 transition-colors cursor-pointer"
            aria-label={`Download ${a.original_name}`}>
            {busy === a.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Download
          </button>
        </li>
      ))}
    </ul>
  )
}
