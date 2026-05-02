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
import { createArea, updateArea } from "@/services/areas"
import type { Area, AreaCreate } from "@/types/area"

interface AreaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  area?: Area
}

type FormData = {
  nombre: string
  descripcion: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = { nombre: "", descripcion: "" }

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.nombre.trim()) errors.nombre = "El nombre es requerido"
  else if (form.nombre.trim().length > 100) errors.nombre = "Máximo 100 caracteres"
  return errors
}

export function AreaModal({ open, onClose, onSuccess, area }: AreaModalProps) {
  const isEdit = Boolean(area)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  useEffect(() => {
    if (area) {
      setForm({ nombre: area.nombre, descripcion: area.descripcion ?? "" })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
    setServerError("")
  }, [area, open])

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
      if (isEdit && area) {
        await updateArea(area.id, {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
        })
      } else {
        const payload: AreaCreate = {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
        }
        await createArea(payload)
      }
      onSuccess()
    } catch {
      setServerError("Ocurrió un error al guardar. Intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar área" : "Nueva área"}</DialogTitle>
        </DialogHeader>

        <form id="area-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">
                Nombre
                <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <Input
                id="nombre"
                value={form.nombre}
                onChange={handleField("nombre")}
                aria-invalid={Boolean(errors.nombre)}
                aria-required
                maxLength={100}
              />
              {errors.nombre && (
                <p className="text-xs text-destructive" role="alert">{errors.nombre}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={handleField("descripcion")}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          {serverError && (
            <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="area-form"
            className="min-h-11"
            disabled={submitting}
          >
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear área"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
