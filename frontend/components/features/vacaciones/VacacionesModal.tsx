"use client"

import { useState, useEffect, useMemo } from "react"

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
import { createVacacion, fetchSaldoVacaciones } from "@/services/vacaciones"
import { fetchEmpleados } from "@/services/empleados"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { SaldoResumen } from "./SaldoResumen"
import type { Empleado } from "@/types/empleado"
import type { Empresa } from "@/types/empresa"
import type { SaldoVacaciones, SolicitudVacacionesCreate, TipoVacacion } from "@/types/vacaciones"

interface VacacionesModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type FormData = {
  empresa_id: string
  empleado_id: string
  tipo: TipoVacacion
  fecha_desde: string
  fecha_hasta: string
  comentario: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = {
  empresa_id: "",
  empleado_id: "",
  tipo: "vacaciones",
  fecha_desde: "",
  fecha_hasta: "",
  comentario: "",
}

const TIPOS: { value: TipoVacacion; label: string }[] = [
  { value: "vacaciones",      label: "Vacaciones"       },
  { value: "semana_free",     label: "Semana free"      },
  { value: "dia_free",        label: "Día free"         },
  { value: "permiso_especial",label: "Permiso especial" },
]

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.empresa_id) errors.empresa_id = "La empresa es requerida"
  if (!form.empleado_id) errors.empleado_id = "El empleado es requerido"
  if (!form.fecha_desde) errors.fecha_desde = "La fecha de inicio es requerida"
  if (!form.fecha_hasta) errors.fecha_hasta = "La fecha de fin es requerida"
  if (form.fecha_desde && form.fecha_hasta && form.fecha_hasta < form.fecha_desde)
    errors.fecha_hasta = "La fecha de fin debe ser igual o posterior al inicio"
  return errors
}

export function VacacionesModal({ open, onClose, onSuccess }: VacacionesModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [empleadosLoading, setEmpleadosLoading] = useState(false)
  const [saldo, setSaldo] = useState<SaldoVacaciones | null>(null)

  useEffect(() => {
    if (!open) return
    const activa = getEmpresaActivaId() ?? ""
    setForm({ ...EMPTY, empresa_id: activa })
    setErrors({})
    setServerError("")
    setEmpleados([])
    setSaldo(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    fetchEmpresas()
      .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
      .catch(() => setEmpresas([]))
  }, [open])

  useEffect(() => {
    if (!form.empresa_id) { setEmpleados([]); return }
    setEmpleadosLoading(true)
    fetchEmpleados(1, 100, undefined, "activo", form.empresa_id)
      .then((res) => setEmpleados(res.items))
      .catch(() => setEmpleados([]))
      .finally(() => setEmpleadosLoading(false))
  }, [form.empresa_id])

  useEffect(() => {
    if (!form.empleado_id) { setSaldo(null); return }
    fetchSaldoVacaciones(form.empleado_id, form.empresa_id || undefined)
      .then(setSaldo)
      .catch(() => setSaldo(null))
  }, [form.empleado_id])

  const diasSolicitados = useMemo(() => {
    if (!form.fecha_desde || !form.fecha_hasta || form.fecha_hasta < form.fecha_desde) return 0
    const d = (new Date(form.fecha_hasta).getTime() - new Date(form.fecha_desde).getTime()) / 86400000
    return Math.round(d) + 1
  }, [form.fecha_desde, form.fecha_hasta])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function handleEmpresaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, empresa_id: e.target.value, empleado_id: "" }))
    setErrors((prev) => ({ ...prev, empresa_id: undefined, empleado_id: undefined }))
    setSaldo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setServerError("")
    try {
      const payload: SolicitudVacacionesCreate = {
        empleado_id: form.empleado_id,
        fecha_desde: form.fecha_desde,
        fecha_hasta: form.fecha_hasta,
        tipo: form.tipo,
        comentario: form.comentario.trim() || undefined,
      }
      await createVacacion(payload)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocurrió un error al guardar"
      setServerError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar vacaciones</DialogTitle>
        </DialogHeader>

        <form id="vacaciones-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="empresa_id">Empresa <span className="text-destructive" aria-hidden>*</span></Label>
              <select id="empresa_id" className={SELECT_CLASS} value={form.empresa_id} onChange={handleEmpresaChange} aria-required aria-invalid={Boolean(errors.empresa_id)}>
                <option value="">Seleccionar empresa</option>
                {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              {errors.empresa_id && <p className="text-xs text-destructive" role="alert">{errors.empresa_id}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="empleado_id">Empleado <span className="text-destructive" aria-hidden>*</span></Label>
              <select id="empleado_id" className={SELECT_CLASS} value={form.empleado_id} onChange={field("empleado_id")} disabled={!form.empresa_id || empleadosLoading} aria-required aria-invalid={Boolean(errors.empleado_id)}>
                <option value="">
                  {!form.empresa_id ? "Seleccioná primero una empresa" : empleadosLoading ? "Cargando..." : "Seleccionar empleado"}
                </option>
                {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
              </select>
              {errors.empleado_id && <p className="text-xs text-destructive" role="alert">{errors.empleado_id}</p>}
            </div>

            {saldo && (
              <SaldoResumen saldo={saldo} diasSolicitados={diasSolicitados} tipo={form.tipo} />
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" className={SELECT_CLASS} value={form.tipo} onChange={field("tipo")}>
                {TIPOS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_desde">Desde <span className="text-destructive" aria-hidden>*</span></Label>
                <Input id="fecha_desde" type="date" value={form.fecha_desde} onChange={field("fecha_desde")} aria-required aria-invalid={Boolean(errors.fecha_desde)} />
                {errors.fecha_desde && <p className="text-xs text-destructive" role="alert">{errors.fecha_desde}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_hasta">Hasta <span className="text-destructive" aria-hidden>*</span></Label>
                <Input id="fecha_hasta" type="date" value={form.fecha_hasta} min={form.fecha_desde} onChange={field("fecha_hasta")} aria-required aria-invalid={Boolean(errors.fecha_hasta)} />
                {errors.fecha_hasta && <p className="text-xs text-destructive" role="alert">{errors.fecha_hasta}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comentario">Comentario</Label>
              <Textarea id="comentario" value={form.comentario} onChange={field("comentario")} rows={2} className="resize-none" />
            </div>
          </div>

          {serverError && <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" form="vacaciones-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Guardando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
