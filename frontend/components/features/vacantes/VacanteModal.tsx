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
import { createVacante } from "@/services/vacantes"
import { fetchAreas } from "@/services/areas"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { Area } from "@/types/area"
import type { Empresa } from "@/types/empresa"
import type { VacanteCreate } from "@/types/vacantes"

interface VacanteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type FormData = {
  empresa_id: string
  titulo: string
  area_id: string
  tipo_contrato: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = {
  empresa_id: "",
  titulo: "",
  area_id: "",
  tipo_contrato: "efectivo",
}

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.empresa_id) errors.empresa_id = "La empresa es requerida"
  if (!form.titulo.trim()) errors.titulo = "El título es requerido"
  if (!form.area_id) errors.area_id = "El área es requerida"
  if (!form.tipo_contrato) errors.tipo_contrato = "El tipo de contrato es requerido"
  return errors
}

export function VacanteModal({ open, onClose, onSuccess }: VacanteModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [areasLoading, setAreasLoading] = useState(false)

  // Inicializar form al abrir, pre-seleccionar empresa activa del topbar
  useEffect(() => {
    if (!open) return
    const activa = getEmpresaActivaId() ?? ""
    setForm({ ...EMPTY, empresa_id: activa })
    setErrors({})
    setServerError("")
    setAreas([])
  }, [open])

  // Cargar empresas al abrir
  useEffect(() => {
    if (!open) return
    fetchEmpresas()
      .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
      .catch(() => setEmpresas([]))
  }, [open])

  // Recargar áreas cuando cambia la empresa seleccionada
  useEffect(() => {
    if (!form.empresa_id) {
      setAreas([])
      return
    }
    setAreasLoading(true)
    fetchAreas(form.empresa_id)
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false))
  }, [form.empresa_id])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((prev) => ({ ...prev, [key]: val }))
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function handleEmpresaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setForm((prev) => ({ ...prev, empresa_id: val, area_id: "" }))
    setErrors((prev) => ({ ...prev, empresa_id: undefined, area_id: undefined }))
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
        empresa_id: form.empresa_id,
        titulo: form.titulo.trim(),
        area_id: form.area_id,
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

            {/* Empresa */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="empresa_id">
                Empresa
                <span className="ml-0.5 text-destructive" aria-hidden>*</span>
              </Label>
              <select
                id="empresa_id"
                className={SELECT_CLASS}
                value={form.empresa_id}
                onChange={handleEmpresaChange}
                aria-invalid={Boolean(errors.empresa_id)}
                aria-required
              >
                <option value="">Seleccionar empresa</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
              {errors.empresa_id && (
                <p className="text-xs text-destructive" role="alert">{errors.empresa_id}</p>
              )}
            </div>

            {/* Título */}
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

            {/* Área — dependiente de empresa */}
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
                disabled={!form.empresa_id || areasLoading}
                aria-invalid={Boolean(errors.area_id)}
                aria-required
              >
                <option value="">
                  {!form.empresa_id ? "Seleccioná primero una empresa" : areasLoading ? "Cargando..." : "Seleccionar área"}
                </option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              {errors.area_id && (
                <p className="text-xs text-destructive" role="alert">{errors.area_id}</p>
              )}
            </div>

            {/* Tipo de contrato */}
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
          </div>

          {serverError && (
            <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" form="vacante-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Guardando..." : "Crear vacante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
