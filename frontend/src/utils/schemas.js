/** Zod schemas - mirror the backend validation so users get instant feedback. */
import { z } from 'zod'

export const MAX_FILE_MB = 4
export const MAX_FILES = 3
const ALLOWED = ['image/jpeg', 'image/png', 'application/pdf']
const ALLOWED_EXT = /\.(jpe?g|png|pdf)$/i

export const filesSchema = z
  .array(z.instanceof(File))
  .max(MAX_FILES, `You can attach at most ${MAX_FILES} files.`)
  .refine((files) => files.every((f) => ALLOWED.includes(f.type) && ALLOWED_EXT.test(f.name)), 'Only JPG, PNG and PDF files are allowed.')
  .refine((files) => files.every((f) => f.size <= MAX_FILE_MB * 1024 * 1024), `Each file must be ${MAX_FILE_MB} MB or smaller.`)

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/\d/, 'Include at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Include at least one special character.')

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your full name.').max(150)
      .regex(/^[A-Za-z][A-Za-z .'-]+$/, 'Use letters, spaces, dots, hyphens or apostrophes only.'),
    email: z.string().trim().email('Enter a valid email address.'),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
    password,
    confirm_password: z.string(),
  })
  .refine((v) => v.password === v.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match.' })

export const grievanceSchema = z.object({
  district: z.string().min(1, 'Select your district.'),
  category: z.string().min(1, 'Select a category.'),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters.').max(200),
  description: z.string().trim().min(30, 'Describe the issue in at least 30 characters.').max(5000),
  attachments: filesSchema,
})

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  subject: z.string().trim().min(3, 'Enter a subject.').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters.').max(3000),
})

export const actionReportSchema = z.object({
  action_taken: z.string().trim().min(20, 'Describe the action taken (min 20 characters).').max(5000),
  resolution_details: z.string().trim().min(20, 'Describe the resolution (min 20 characters).').max(5000),
  attachments: filesSchema,
})
