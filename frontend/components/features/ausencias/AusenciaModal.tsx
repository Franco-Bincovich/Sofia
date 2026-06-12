"use client"

import { useState, useEffect } from "react"

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  createAusencia, updateAusencia, fetchTiposAusencia, createTipoAusencia,
} from "@/services/ausencias"
import { fetchEmpleados } from "@/services/empleados"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { Ausencia, AusenciaCreate, AusenciaUpdate, TipoAusencia } from "@/types/ausencias"
import type { Empleado } from "@/types/empleado"
import type { Empresa } from "@/types/empresa"

interface AusenciaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editing?: Ausencia | null
}

type FormData = {
  empresa_id: string
  empleado_id: string
  tipo_id: string
  fecha_desde: string
  fecha_hasta: string
  justificada: boolean
  motivo: string
}

type FormErrors = Partial<Record<keyof FormData | "nuevo_tipo", string>>

const EMPTY: FormData = {
  empresa_id: "", empleado_id: "", tipo_id: "",
  fecha_desde: "", fecha_hasta: "", justificada: false, motivo: "",
}

const NUEVO = "__nuevo__"

const SEL =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

function validate(form: FormData): FormErrors {
  const e: FormErrors = {}
  if (!form.empresa_id) e.empresa_id = "Requerido"
  if (!form.empleado_id) e.empleado_id = "Requerido"
  if (!form.tipo_id || form.tipo_id === NUEVO) e.tipo_id = "Seleccioná un tipo"
  if (!form.fecha_desde) e.fecha_desde = "Requerido"
  if (!form.fecha_hasta) e.fecha_hasta = "Requerido"
  if (form.fecha_desde && form.fecha_hasta && form.fecha_hasta < form.fecha_desde)
    e.fecha_hasta = "Debe ser igual o posterior al inicio"
  return e
}

export function AusenciaModal({ open, onClose, onSuccess, editing }: AusenciaModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [empleadosLoading, setEmpleadosLoading] = useState(false)
  const [tipos, setTipos] = useState<TipoAusencia[]>([])
  const [nuevoTipo, setNuevoTipo] = useState("")
  const [creandoTipo, setCreandoTipo] = useState(false)

  const isEditing = Boolean(editing)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setServerError("")
    setNuevoTipo("")
    if (editing) {
      setForm({
        empresa_id: editing.empresa_id,
        empleado_id: editing.empleado_id,
        tipo_id: editing.tipo_id,
        fecha_desde: editing.fecha_desde,
        fecha_hasta: editing.fecha_hasta,
        justificada: editing.justificada,
        motivo: editing.motivo ?? "",
      })
    } else {
      setForm({ ...EMPTY, empresa_id: getEmpresaActivaId() ?? "" })
    }
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    fetchEmpresas().then((r) => setEmpresas(r.items.filter((e) => e.activa))).catch(() => {})
    fetchTiposAusencia().then((r) => setTipos(r.items)).catch(() => {})
  }, [open])

  useEffect(() => {
    if (!form.empresa_id) { setEmpleados([]); return }
    setEmpleadosLoading(true)
    fetchEmpleados(1, 100, undefined, "activo", form.empresa_id)
      .then((r) => setEmpleados(r.items))
      .catch(() => setEmpleados([]))
      .finally(() => setEmpleadosLoading(false))
  }, [form.empresa_id])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
    }
  }

  function handleEmpresaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((p) => ({ ...p, empresa_id: e.target.value, empleado_id: "" }))
    setErrors((p) => ({ ...p, empresa_id: undefined, empleado_id: undefined }))
  }

  async function handleCrearTipo() {
    if (!nuevoTipo.trim()) return
    setCreandoTipo(true)
    try {
      const created = await createTipoAusencia(nuevoTipo.trim())
      setTipos((p) => [...p, created].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setForm((p) => ({ ...p, tipo_id: created.id }))
      setNuevoTipo("")
      setErrors((p) => ({ ...p, tipo_id: undefined }))
    } catch {
      setErrors((p) => ({ ...p, nuevo_tipo: "No se pudo crear el tipo" }))
    } finally {
      setCreandoTipo(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setServerError("")
    try {
      if (isEditing) {
        const payload: AusenciaUpdate = {
          tipo_id: form.tipo_id,
          fecha_desde: form.fecha_desde,
          fecha_hasta: form.fecha_hasta,
          justificada: form.justificada,
          motivo: form.motivo.trim(),  // "" enviado → backend lo normaliza a null
        }
        await updateAusencia(editing!.id, payload)
      } else {
        const payload: AusenciaCreate = {
          empleado_id: form.empleado_id,
          tipo_id: form.tipo_id,
          fecha_desde: form.fecha_desde,
          fecha_hasta: form.fecha_hasta,
          justificada: form.justificada,
          motivo: form.motivo.trim() || undefined,
        }
        await createAusencia(payload)
      }
      onSuccess()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Ocurrió un error al guardar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar ausencia" : "Registrar ausencia"}</DialogTitle>
        </DialogHeader>

        <form id="ausencia-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">

            {!isEditing && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="empresa_id">Empresa <span className="text-destructive" aria-hidden>*</span></Label>
                  <select id="empresa_id" className={SEL} value={form.empresa_id} onChange={handleEmpresaChange} aria-required aria-invalid={Boolean(errors.empresa_id)}>
                    <option value="">Seleccionar empresa</option>
                    {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                  {errors.empresa_id && <p className="text-xs text-destructive" role="alert">{errors.empresa_id}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="empleado_id">Empleado <span className="text-destructive" aria-hidden>*</span></Label>
                  <select id="empleado_id" className={SEL} value={form.empleado_id} onChange={field("empleado_id")} disabled={!form.empresa_id || empleadosLoading} aria-required aria-invalid={Boolean(errors.empleado_id)}>
                    <option value="">
                      {!form.empresa_id ? "Seleccioná primero una empresa" : empleadosLoading ? "Cargando..." : "Seleccionar empleado"}
                    </option>
                    {empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                  </select>
                  {errors.empleado_id && <p className="text-xs text-destructive" role="alert">{errors.empleado_id}</p>}
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo_id">Tipo de ausencia <span className="text-destructive" aria-hidden>*</span></Label>
              <select id="tipo_id" className={SEL} value={form.tipo_id} onChange={field("tipo_id")} aria-required aria-invalid={Boolean(errors.tipo_id)}>
                <option value="">Seleccionar tipo</option>
                {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                <option value={NUEVO}>+ Crear tipo nuevo...</option>
              </select>
              {errors.tipo_id && <p className="text-xs text-destructive" role="alert">{errors.tipo_id}</p>}
            </div>

            {form.tipo_id === NUEVO && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/30 p-3">
                <Label htmlFor="nuevo_tipo" className="text-xs text-muted-foreground">Nombre del nuevo tipo</Label>
                <div className="flex gap-2">
                  <Input id="nuevo_tipo" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} placeholder="ej. Licencia por maternidad" className="h-8 text-sm" />
                  <Button type="button" size="sm" className="h-8 shrink-0" disabled={!nuevoTipo.trim() || creandoTipo} onClick={handleCrearTipo}>
                    {creandoTipo ? "..." : "Crear"}
                  </Button>
                </div>
                {errors.nuevo_tipo && <p className="text-xs text-destructive" role="alert">{errors.nuevo_tipo}</p>}
              </div>
            )}

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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="justificada"
                checked={form.justificada}
                onChange={(e) => setForm((p) => ({ ...p, justificada: e.target.checked }))}
                className="h-4 w-4 cursor-pointer rounded border border-input accent-primary"
              />
              <Label htmlFor="justificada" className="cursor-pointer font-normal">Ausencia justificada</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivo">Motivo <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
              <Textarea id="motivo" value={form.motivo} onChange={field("motivo")} rows={2} className="resize-none" placeholder="Descripción breve" />
            </div>

          </div>

          {serverError && <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" form="ausencia-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
