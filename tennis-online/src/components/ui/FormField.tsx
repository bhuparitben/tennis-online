import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

const inputBase =
  'w-full rounded-lg border border-border px-3 py-2 text-sm bg-white text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:bg-gray-50'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children?: ReactNode
  className?: string
}

export function FormField({ label, required, error, hint, children, className = '' }: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={[inputBase, error ? 'border-danger focus:ring-danger/30' : '', className].join(' ')}
      {...props}
    />
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={[inputBase, error ? 'border-danger focus:ring-danger/30' : '', className].join(' ')}
      {...props}
    >
      {children}
    </select>
  )
}

interface CheckboxFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}
export function CheckboxField({ label, checked, onChange, disabled }: CheckboxFieldProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-border text-primary accent-primary"
      />
      <span className="text-sm text-ink group-hover:text-primary transition-colors">{label}</span>
    </label>
  )
}

interface RadioGroupProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  error?: string
}
export function RadioGroup({ label, value, options, onChange, error }: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex gap-4 flex-wrap">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="accent-primary"
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
