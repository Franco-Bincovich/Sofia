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
import { createVacante } from "@/services/vacantes"
import { fetchAreas } from "@/services/areas"
import type { Area } from "@/types/area"
import type { VacanteCreate } from "@/types/vacantes"

interface VacanteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type FormData = {
  titulo: string
  area_id: string
  descripcion: string
  tipo_contrato: string
  requisitos: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = {
  titulo: "",
  area_id: "",
  descripcion: "",
  tipo_contrato: "efectivo",
  requisitos: "",
}

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.titulo.trim()) errors.titulo = "El título es requerido"
  if (!form.area_id) errors.area_id = "El área es requerida"
  if (!form.tipo_contrato) errors.tipo_contrato = "El tipo de contrato es requerido"
  return errors
}

function parseRequisitos(raw: string): string[] {
  return raw
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean)
}

export function VacanteModal({ open, onClose, onSuccess }: VacanteModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [areas, setAreas] = useState<Area[]>([])
  const [areasLoading, setAreasLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setAreasLoading(true)
    fetchAreas()
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setErrors({})
    setServerError("")
  }, [open])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const payload: VacanteCreate = {
        titulo: form.titulo.trim(),
        area_id: form.area_id,
        descripcion: form.descripcion.trim() || undefined,
        requisitos: parseRequisitos(form.requisitos),
        tipo_contrato: form.tipo_contrato,
      }
      await createVacante(payload)
      onSuccess()
    } catch {
      setServerError("Ocurrió un error al guardar. Intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva vacante</DialogTitle>
        </DialogHeader>

        <form id="vacante-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titulo">
                Título
                <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={field("titulo")}
                aria-invalid={Boolean(errors.titulo)}
                aria-required
              />
              {errors.titulo && (
                <p className="text-xs text-destructive" role="alert">{errors.titulo}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="area_id">
                Área
                <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <select
                id="area_id"
                className={SELECT_CLASS}
                value={form.area_id}
                onChange={field("area_id")}
                disabled={areasLoading}
                aria-invalid={Boolean(errors.area_id)}
                aria-required
              >
                <option value="">{areasLoading ? "Cargando..." : "Seleccionar área"}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              {errors.area_id && (
                <p className="text-xs text-destructive" role="alert">{errors.area_id}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo_contrato">
                Tipo de contrato
                <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <select
                id="tipo_contrato"
                className={SELECT_CLASS}
                value={form.tipo_contrato}
                onChange={field("tipo_contrato")}
              >
                <option value="efectivo">Relación de dependencia</option>
                <option value="plazo_fijo">Plazo fijo</option>
                <option value="contratado">Contratado</option>
                <option value="pasantia">Pasantía</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={form.descripcion}
                onChange={field("descripcion")}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="requisitos">
                Requisitos
                <span className="ml-1 text-xs font-normal text-muted-foreground">(uno por línea)</span>
              </Label>
              <Textarea
                id="requisitos"
                value={form.requisitos}
                onChange={field("requisitos")}
                rows={4}
                className="resize-none"
                placeholder={"5+ años de experiencia\nReact y TypeScript\n..."}
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
            form="vacante-form"
            className="min-h-11"
            disabled={submitting}
          >
            {submitting ? "Guardando..." : "Crear vacante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
