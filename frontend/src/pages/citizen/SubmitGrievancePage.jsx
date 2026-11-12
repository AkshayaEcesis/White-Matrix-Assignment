import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bot, CheckCircle2, Copy, FileSearch, Send, Sparkles, Wand2 } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { aiApi, citizenApi } from '../../api/endpoints'
import AIAnalysisPanel from '../../components/grievance/AIAnalysisPanel'
import Button from '../../components/ui/Button'
import { Card, PageHeader } from '../../components/ui/Card'
import { Alert, Spinner } from '../../components/ui/Feedback'
import { FileInput, Input, Select, Textarea } from '../../components/ui/Form'
import { useMeta } from '../../context/MetaContext'
import { useToast } from '../../context/ToastContext'
import { applyFieldErrors, getErrorMessage } from '../../utils/errors'
import { grievanceSchema, MAX_FILE_MB, MAX_FILES } from '../../utils/schemas'

function SuccessScreen({ grievance, onAnother }) {
  const toast = useToast()
  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-10 text-center shadow-xl shadow-slate-200/50">
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-gold-400 to-teal-500" />
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100">
        <CheckCircle2 className="size-9" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Grievance Submitted Successfully</h1>
      <p className="mt-2 text-sm text-slate-600">Your grievance has been officially registered and forwarded to the Chief Minister&apos;s Office for review.</p>
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-mint-50 to-white p-5 shadow-xs">
        <p className="text-xs uppercase font-bold tracking-wider text-emerald-800">Your Unique Reference Number</p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <p className="font-mono text-2xl sm:text-3xl font-extrabold text-brand-800 tracking-wide">{grievance.reference_number}</p>
          <button onClick={() => navigator.clipboard?.writeText(grievance.reference_number).then(() => toast.success('Reference number copied to clipboard!'))}
            className="rounded-xl border border-emerald-300/80 bg-white p-2 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 shadow-2xs transition-colors cursor-pointer" aria-label="Copy reference number">
            <Copy className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-emerald-700">Please save this reference number for future tracking and correspondence.</p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to={`/citizen/grievances/${grievance.reference_number}`} icon={FileSearch} size="md">View Grievance Status</Button>
        <Button variant="secondary" onClick={onAnother} size="md">Submit Another</Button>
      </div>
    </div>
  )
}

export default function SubmitGrievancePage() {
  const meta = useMeta()
  const toast = useToast()
  const [analysis, setAnalysis] = useState(null)
  const [analysing, setAnalysing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [submitted, setSubmitted] = useState(null)
  const [formError, setFormError] = useState('')

  const { register, control, handleSubmit, setValue, getValues, setError, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(grievanceSchema),
    defaultValues: { district: '', category: '', subject: '', description: '', attachments: [] },
  })
  const description = watch('description')

  const analyse = async () => {
    const { description: text, subject, district } = getValues()
    if ((text || '').trim().length < 30) {
      setAiError('Write at least 30 characters in the description so the assistant can analyse it.')
      return
    }
    setAiError('')
    setAnalysing(true)
    try {
      const result = await aiApi.analyse({ description: text, subject, district: district || '' })
      setAnalysis({ ...result, analysedText: text })
      if (!result.ai_available) toast.warning('AI is unavailable right now — showing labelled rule-based suggestions.')
    } catch (err) {
      setAiError(getErrorMessage(err, 'The assistant could not analyse your description.'))
    } finally {
      setAnalysing(false)
    }
  }

  const onSubmit = async (values) => {
    setFormError('')
    try {
      // Re-use the analysis only if the description has not changed since it ran.
      const ai_analysis_id = analysis && analysis.analysedText === values.description ? analysis.analysis_id : undefined
      const created = await citizenApi.create({ ...values, ai_analysis_id })
      setSubmitted(created)
      toast.success(`Grievance ${created.reference_number} submitted.`)
      window.scrollTo({ top: 0 })
    } catch (err) {
      if (!applyFieldErrors(err, setError, ['district', 'category', 'subject', 'description', 'attachments'])) setFormError(getErrorMessage(err))
    }
  }

  if (submitted) {
    return <SuccessScreen grievance={submitted} onAnother={() => { reset(); setAnalysis(null); setSubmitted(null) }} />
  }

  const stale = analysis && analysis.analysedText !== description
  return (
    <>
      <PageHeader title="Submit a grievance" description="Describe the issue clearly. All fields marked * are required." />
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          {formError && <Alert type="error" className="mb-4">{formError}</Alert>}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
            <Select label="District" required options={meta.districts} {...register('district')} error={errors.district?.message} />
            <Select label="Category" required options={meta.categories} {...register('category')} error={errors.category?.message}
              hint="Not sure? Use the AI assistant." />
            <Input className="sm:col-span-2" label="Subject" required maxLength={200} {...register('subject')} error={errors.subject?.message}
              placeholder="e.g. No drinking water supply in Ward 12 for 5 days" />
            <Textarea className="sm:col-span-2" label="Detailed description" required rows={7} maxLength={5000} {...register('description')}
              error={errors.description?.message} hint={`${(description || '').length}/5000 characters. Include location, dates and how many people are affected.`} />
            <Controller name="attachments" control={control} render={({ field }) => (
              <div className="sm:col-span-2">
                <FileInput label="Supporting documents (optional)" value={field.value} onChange={field.onChange} max={MAX_FILES}
                  error={errors.attachments?.message} hint={`JPG, PNG or PDF, up to ${MAX_FILE_MB} MB each.`} />
              </div>
            )} />
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" icon={Send} loading={isSubmitting}>Submit grievance</Button>
              <Button type="button" variant="secondary" icon={Sparkles} onClick={analyse} loading={analysing}>Analyse with AI</Button>
            </div>
          </form>
        </Card>

        <Card title={<span className="inline-flex items-center gap-2"><Bot className="size-5 text-violet-600" aria-hidden /> AI Grievance Assistant</span>}
          subtitle="Suggestions only — you choose the category; officials decide routing and priority.">
          {analysing && <Spinner label="Analysing your description…" />}
          {!analysing && aiError && <Alert type="warning">{aiError}</Alert>}
          {!analysing && !analysis && !aiError && (
            <div className="space-y-3 text-sm text-slate-600">
              <p>Write your description, then click <strong>Analyse with AI</strong>. The assistant will:</p>
              <ul className="list-inside list-disc space-y-1 text-slate-500">
                <li>suggest the relevant department and category</li>
                <li>recommend a priority (Low / Medium / High)</li>
                <li>write a short summary for the CMO</li>
                <li>flag possible duplicate complaints</li>
              </ul>
              <p className="text-xs text-slate-500">If you skip this step, the analysis runs automatically when you submit.</p>
            </div>
          )}
          {!analysing && analysis && (
            <AIAnalysisPanel analysis={analysis} actions={
              <div className="space-y-2">
                {stale && <Alert type="info">You edited the description after the analysis. Run it again for updated suggestions.</Alert>}
                <Button type="button" size="sm" variant="secondary" icon={Wand2}
                  onClick={() => {
                    setValue('category', analysis.suggested_category, { shouldValidate: true })
                    toast.info('Suggested category applied. You can still change it.')
                  }}>
                  Use suggested category
                </Button>
              </div>
            } />
          )}
        </Card>
      </div>
    </>
  )
}
