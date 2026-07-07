"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { PasswordField } from "@/components/features/usuarios/_fields"
import { cambiarPassword } from "@/services/usuarios"
import { getSession, saveSession, ApiError } from "@/services/api"

type FormData = { actual: string; nueva: string; confirmar: string }
type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = { actual: "", nueva: "", confirmar: "" }

function validate(f: FormData): FormErrors {
  const e: FormErrors = {}
  if (!f.actual) e.actual = "Ingresá tu contraseña actual"
  if (f.nueva.length < 8) e.nueva = "Mínimo 8 caracteres"
  else if (f.nueva === f.actual) e.nueva = "La nueva contraseña debe ser distinta de la actual"
  if (f.confirmar !== f.nueva) e.confirmar = "Las contraseñas no coinciden"
  return e
}

/** Form de cambio de contraseña. `forced` = primer login (sin volver, redirige al éxito). */
export function CambiarPasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setForm((p) => ({ ...p, [key]: val }))
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
      if (serverError) setServerError("")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSubmitting(true)
    setServerError("")
    try {
      await cambiarPassword(form.actual, form.nueva)
      toast.success("Contraseña actualizada")
      const s = getSession()
      if (s) saveSession({ ...s, user: { ...s.user, must_change_password: false } })
      if (forced) {
        router.replace("/dashboard")
      } else {
        setForm(EMPTY)
      }
    } catch (err) {
      setServerError(
        err instanceof ApiError
          ? err.message
          : "Error de conexión. Verificá tu red e intentá de nuevo.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <PasswordField
        id="actual" label="Contraseña actual" value={form.actual} onChange={field("actual")}
        error={errors.actual} autoComplete="current-password" disabled={submitting}
      />
      <PasswordField
        id="nueva" label="Nueva contraseña" value={form.nueva} onChange={field("nueva")}
        error={errors.nueva} autoComplete="new-password" disabled={submitting}
      />
      <PasswordField
        id="confirmar" label="Confirmar nueva contraseña" value={form.confirmar} onChange={field("confirmar")}
        error={errors.confirmar} autoComplete="new-password" disabled={submitting}
      />

      {serverError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" className="min-h-[2.75rem] flex-1" disabled={submitting}>
          {submitting ? (
            <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Cambiando…</>
          ) : (
            "Cambiar contraseña"
          )}
        </Button>
      </div>
    </form>
  )
}
