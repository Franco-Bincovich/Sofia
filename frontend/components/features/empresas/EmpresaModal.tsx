"use client"

import { useState, useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createEmpresa, updateEmpresa } from "@/services/empresas"
import type { Empresa, EmpresaCreate } from "@/types/empresa"

interface EmpresaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (empresa: Empresa) => void
  empresa?: Empresa
}

type FormData = {
  nombre: string
  razon_social: string
  cuit: string
  direccion: string
  telefono: string
  email: string
  logo_url: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = {
  nombre: "",
  razon_social: "",
  cuit: "",
  direccion: "",
  telefono: "",
  email: "",
  logo_url: "",
}

const CUIT_RE = /^\d{2}-\d{8}-\d{1}$/

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.nombre.trim()) {
    errors.nombre = "El nombre es requerido"
  }
  if (form.cuit.trim() && !CUIT_RE.test(form.cuit.trim())) {
    errors.cuit = "Formato inválido — debe ser XX-XXXXXXXX-X"
  }
  return errors
}

export function EmpresaModal({ open, onClose, onSuccess, empresa }: EmpresaModalProps) {
  const isEdit = Boolean(empresa)
  const [form, setForm]             = useState<FormData>(EMPTY)
  const [errors, setErrors]         = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  useEffect(() => {
    if (empresa) {
      setForm({
        nombre: empresa.nombre,
        razon_social: empresa.razon_social ?? "",
        cuit: empresa.cuit ?? "",
        direccion: empresa.direccion ?? "",
        telefono: empresa.telefono ?? "",
        email: empresa.email ?? "",
        logo_url: empresa.logo_url ?? "",
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
    setServerError("")
  }, [empresa, open])

  function handleField(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((prev) => ({ ...prev, [key]: val }))
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
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
      let result: Empresa
      const payload: EmpresaCreate = {
        nombre: form.nombre.trim(),
        razon_social: form.razon_social.trim() || undefined,
        cuit: form.cuit.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        logo_url: form.logo_url.trim() || undefined,
      }
      if (isEdit && empresa) {
        result = await updateEmpresa(empresa.id, payload)
      } else {
        result = await createEmpresa(payload)
      }
      onSuccess(result)
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Ocurrió un error al guardar. Intentá de nuevo.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
        </DialogHeader>

        <form id="empresa-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">
                Nombre <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={handleField("nombre")}
                aria-invalid={Boolean(errors.nombre)}
                aria-required
              />
              {errors.nombre && (
                <p className="text-xs text-destructive" role="alert">{errors.nombre}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="razon_social">Razón social</Label>
                <Input id="razon_social" value={form.razon_social} onChange={handleField("razon_social")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cuit">CUIT</Label>
                <Input
                  id="cuit"
                  value={form.cuit}
                  onChange={handleField("cuit")}
                  placeholder="XX-XXXXXXXX-X"
                  aria-invalid={Boolean(errors.cuit)}
                />
                {errors.cuit && (
                  <p className="text-xs text-destructive" role="alert">{errors.cuit}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={form.telefono} onChange={handleField("telefono")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={handleField("email")} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direccion">Dirección</Label>
              <Textarea
                id="direccion"
                value={form.direccion}
                onChange={handleField("direccion")}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="logo_url">URL del logo</Label>
              <Input
                id="logo_url"
                value={form.logo_url}
                onChange={handleField("logo_url")}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Para subir desde archivo usá la sección de logo en el detalle de la empresa.
              </p>
            </div>
          </div>

          {serverError && (
            <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="empresa-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear empresa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
