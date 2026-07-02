"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  type?: string
}

/** Campo de texto requerido con label, asterisco y error inline (form de alta de usuario). */
export function TextField({ id, label, value, onChange, error, type }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} <span className="ml-0.5 text-destructive" aria-hidden>*</span>
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-required
      />
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </div>
  )
}
