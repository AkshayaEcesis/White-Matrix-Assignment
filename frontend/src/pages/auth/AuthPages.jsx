import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '../../components/layout/Brand'
import Button from '../../components/ui/Button'
import { Alert } from '../../components/ui/Feedback'
import { Input } from '../../components/ui/Form'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { applyFieldErrors, getErrorMessage } from '../../utils/errors'
import { ROLE_HOME } from '../../utils/format'
import { loginSchema, registerSchema } from '../../utils/schemas'

const DEMO_ACCOUNTS = [
  ['Citizen', 'citizen@example.com', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
  ['CMO Administrator', 'cmo.admin@example.com', 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'],
  ['Officer (Water)', 'officer.wrd@example.com', 'bg-sky-50 text-sky-800 border-sky-200'],
  ['Officer (Health)', 'officer.hfw@example.com', 'bg-rose-50 text-rose-800 border-rose-200'],
]

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-[calc(100vh-10rem)] flex-col justify-center px-4 py-12 sm:px-6 bg-gradient-to-b from-brand-50/50 via-surface to-slate-100/60">
      {/* Decorative ambient spots */}
      <div className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 size-96 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute right-10 bottom-10 size-72 rounded-full bg-amber-400/10 blur-3xl" aria-hidden />

      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-600 via-gold-400 to-teal-500" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-xs text-slate-600">{footer}</p>}
      </div>
    </div>
  )
}

function PasswordInput({ error, label = 'Password', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input label={label} type={show ? 'text' : 'password'} error={error} required {...props} />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-[30px] rounded p-1.5 text-slate-400 hover:text-slate-700"
        aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values) => {
    setFormError('')
    try {
      const user = await login(values)
      toast.success(`Welcome, ${user.full_name}.`)
      const from = location.state?.from
      const home = ROLE_HOME[user.role]
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setFormError(getErrorMessage(err, 'Login failed.'))
    }
  }

  return (
    <AuthShell title="Log in" subtitle="Citizens, CMO administrators and department officers sign in here."
      footer={<>New citizen? <Link to="/register" className="font-medium text-brand-700 hover:underline">Create an account</Link></>}>
      {location.state?.from && <Alert type="info" className="mb-4">Please log in to continue.</Alert>}
      {formError && <Alert type="error" className="mb-4">{formError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" required {...register('email')} error={errors.email?.message} />
        <PasswordInput autoComplete="current-password" {...register('password')} error={errors.password?.message} />
        <Button type="submit" className="w-full" icon={LogIn} loading={isSubmitting}>Log in</Button>
      </form>
      {import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false' && (
        <details className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 text-xs transition-colors open:bg-slate-50">
          <summary className="flex cursor-pointer items-center justify-between font-semibold text-slate-800">
            <span className="flex items-center gap-2">
              <KeyRound className="size-4 text-amber-600" aria-hidden /> Demo accounts for evaluators
            </span>
            <span className="text-[11px] text-brand-700 font-medium">Click to fill</span>
          </summary>
          <p className="mt-2 text-[11px] text-slate-500">Test accounts with preset roles. Passwords can be checked in README.</p>
          <ul className="mt-3 space-y-1.5">
            {DEMO_ACCOUNTS.map(([role, email, badgeCls]) => (
              <li key={email}>
                <button type="button" onClick={() => setValue('email', email, { shouldValidate: true })}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-white px-3 py-2 text-left hover:border-brand-400 hover:bg-emerald-50/30 transition-all cursor-pointer shadow-2xs">
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] border ${badgeCls}`}>{role}</span>
                  <span className="font-mono text-xs text-slate-600 truncate ml-2">{email}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </AuthShell>
  )
}

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', mobile: '', password: '', confirm_password: '' },
  })

  const onSubmit = async (values) => {
    setFormError('')
    try {
      await registerUser(values)
      toast.success('Account created. Welcome to the grievance portal!')
      navigate('/citizen', { replace: true })
    } catch (err) {
      if (!applyFieldErrors(err, setError, Object.keys(values))) setFormError(getErrorMessage(err))
    }
  }

  return (
    <AuthShell title="Create a citizen account" subtitle="Register to submit and track grievances."
      footer={<>Already registered? <Link to="/login" className="font-medium text-brand-700 hover:underline">Log in</Link></>}>
      {formError && <Alert type="error" className="mb-4">{formError}</Alert>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Full name" autoComplete="name" required {...register('full_name')} error={errors.full_name?.message} />
        <Input label="Email" type="email" autoComplete="email" required {...register('email')} error={errors.email?.message} />
        <Input label="Mobile number" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} required
          {...register('mobile')} error={errors.mobile?.message} hint="10-digit mobile number" />
        <PasswordInput autoComplete="new-password" {...register('password')} error={errors.password?.message} />
        <p className="-mt-2 text-xs text-slate-500">At least 8 characters with upper & lower case letters, a number and a symbol.</p>
        <PasswordInput label="Confirm password" autoComplete="new-password" {...register('confirm_password')} error={errors.confirm_password?.message} />
        <Button type="submit" className="w-full" icon={UserPlus} loading={isSubmitting}>Create account</Button>
      </form>
    </AuthShell>
  )
}
