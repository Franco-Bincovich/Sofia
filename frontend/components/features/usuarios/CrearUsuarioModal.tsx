"use client"

import { useEffect, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmpleadoLiderSelect } from "@/components/features/usuarios/EmpleadoLiderSelect"
import { TextField } from "@/components/features/usuarios/_fields"
import {
  crearUsuario,
  fetchEmpleadosLideres,
  type CrearUsuarioPayload,
  type CrearUsuarioResult,
  type EmpleadoLider,
} from "@/services/usuarios"

interface CrearUsuarioModalProps {
  open: boolean
  onClose: () => void
  onCreated: (result: CrearUsuarioResult) => void
}

type FormData = { nombre: string; apellido: string; email: string; username: string; empleadoId: string }
type FormErrors = Partial<Record<Exclude<keyof FormData, "empleadoId">, string>>

const EMPTY: FormData = { nombre: "", apellido: "", email: "", username: "", empleadoId: "" }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(f: FormData): FormErrors {
  const e: FormErrors = {}
  if (!f.nombre.trim()) e.nombre = "El nombre es requerido"
  if (!f.apellido.trim()) e.apellido = "El apellido es requerido"
  if (!f.email.trim()) e.email = "El email es requerido"
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "Formato de email inválido"
  if (f.username.trim().length < 3) e.username = "Mínimo 3 caracteres"
  return e
}

export function CrearUsuarioModal({ open, onClose, onCreated }: CrearUsuarioModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [lideres, setLideres] = useState<EmpleadoLider[]>([])
  const [lideresLoading, setLideresLoading] = useState(false)
  const [lideresError, setLideresError] = useState(false)

  async function loadLideres() {
    setLideresLoading(true)
    setLideresError(false)
    try {
      setLideres(await fetchEmpleadosLideres())
    } catch {
      setLideresError(true)
    } finally {
      setLideresLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setErrors({})
    setServerError("")
    void loadLideres()
  }, [open])

  function field(key: Exclude<keyof FormData, "empleadoId">) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setForm((p) => ({ ...p, [key]: val }))
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
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
      const payload: CrearUsuarioPayload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        empleado_id: form.empleadoId || undefined,
      }
      onCreated(await crearUsuario(payload))
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "No se pudo crear el usuario. Intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
        </DialogHeader>

        <form id="crear-usuario-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <TextField id="nombre" label="Nombre" value={form.nombre} onChange={field("nombre")} error={errors.nombre} />
              <TextField id="apellido" label="Apellido" value={form.apellido} onChange={field("apellido")} error={errors.apellido} />
            </div>
            <TextField id="email" label="Email" type="email" value={form.email} onChange={field("email")} error={errors.email} />
            <TextField id="username" label="Nombre de usuario" value={form.username} onChange={field("username")} error={errors.username} />
            <EmpleadoLiderSelect
              value={form.empleadoId}
              onChange={(id) => setForm((p) => ({ ...p, empleadoId: id }))}
              options={lideres}
              loading={lideresLoading}
              error={lideresError}
              onRetry={loadLideres}
            />
          </div>
          {serverError && <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="crear-usuario-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Creando..." : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
