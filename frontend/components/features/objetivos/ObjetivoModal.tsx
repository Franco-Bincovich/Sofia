"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createObjetivo, fetchUsuariosActivos, updateObjetivo } from "@/services/objetivos"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { Objetivo, ObjetivoCreate, ObjetivoUpdate, PrioridadObjetivo, UserItem } from "@/types/objetivo"
import type { Empresa } from "@/types/empresa"

interface Props { open: boolean; onClose: () => void; onSuccess: () => void; editing?: Objetivo | null }

type FormData = { empresa_id: string; responsable_id: string; titulo: string; descripcion: string; prioridad: PrioridadObjetivo; fecha_entrega: string }
type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = { empresa_id: "", responsable_id: "", titulo: "", descripcion: "", prioridad: "media", fecha_entrega: "" }
const SEL = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

function validate(form: FormData, isEdit: boolean): FormErrors {
  const e: FormErrors = {}
  if (!isEdit && !form.empresa_id) e.empresa_id = "Requerido"
  if (!form.responsable_id)        e.responsable_id = "Requerido"
  if (!form.titulo.trim())         e.titulo = "Requerido"
  return e
}

export function ObjetivoModal({ open, onClose, onSuccess, editing }: Props) {
  const isEdit = Boolean(editing)
  const [form, setForm]             = useState<FormData>(EMPTY)
  const [errors, setErrors]         = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [usuarios, setUsuarios]     = useState<UserItem[]>([])

  useEffect(() => {
    if (!open) return
    setErrors({}); setServerError("")
    if (editing) {
      setForm({
        empresa_id: editing.empresa_id, responsable_id: editing.responsable_id,
        titulo: editing.titulo, descripcion: editing.descripcion ?? "",
        prioridad: editing.prioridad, fecha_entrega: editing.fecha_entrega ?? "",
      })
    } else {
      setForm({ ...EMPTY, empresa_id: getEmpresaActivaId() ?? "" })
    }
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    fetchEmpresas().then((r) => setEmpresas(r.items.filter((e) => e.activa))).catch(() => {})
    fetchUsuariosActivos().then((r) => setUsuarios(r.items)).catch(() => {})
  }, [open])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form, isEdit)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true); setServerError("")
    try {
      if (isEdit && editing) {
        const payload: ObjetivoUpdate = {
          responsable_id: form.responsable_id || undefined,
          titulo: form.titulo.trim() || undefined,
          descripcion: form.descripcion.trim() || undefined,
          prioridad: form.prioridad,
          fecha_entrega: form.fecha_entrega || undefined,
        }
        await updateObjetivo(editing.id, payload)
      } else {
        const payload: ObjetivoCreate = {
          empresa_id: form.empresa_id, responsable_id: form.responsable_id,
          titulo: form.titulo.trim(), prioridad: form.prioridad,
          descripcion: form.descripcion.trim() || undefined,
          fecha_entrega: form.fecha_entrega || undefined,
        }
        await createObjetivo(payload)
      }
      onSuccess()
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Ocurrió un error al guardar")
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar objetivo" : "Nuevo objetivo"}</DialogTitle></DialogHeader>
        <form id="obj-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-2">
            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="obj_empresa">Empresa <span className="text-destructive" aria-hidden>*</span></Label>
                <select id="obj_empresa" className={SEL} value={form.empresa_id} onChange={field("empresa_id")} aria-required aria-invalid={Boolean(errors.empresa_id)}>
                  <option value="">Seleccionar empresa</option>
                  {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
                {errors.empresa_id && <p className="text-xs text-destructive" role="alert">{errors.empresa_id}</p>}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj_titulo">Título <span className="text-destructive" aria-hidden>*</span></Label>
              <Input id="obj_titulo" value={form.titulo} onChange={field("titulo")} aria-required aria-invalid={Boolean(errors.titulo)} placeholder="ej. Actualizar políticas de licencias" />
              {errors.titulo && <p className="text-xs text-destructive" role="alert">{errors.titulo}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="obj_responsable">Responsable <span className="text-destructive" aria-hidden>*</span></Label>
                <select id="obj_responsable" className={SEL} value={form.responsable_id} onChange={field("responsable_id")} aria-required aria-invalid={Boolean(errors.responsable_id)}>
                  <option value="">{usuarios.length === 0 ? "Cargando..." : "Seleccionar usuario"}</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
                </select>
                {errors.responsable_id && <p className="text-xs text-destructive" role="alert">{errors.responsable_id}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="obj_prioridad">Prioridad</Label>
                <select id="obj_prioridad" className={SEL} value={form.prioridad} onChange={field("prioridad")}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj_fecha">Fecha de entrega <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="obj_fecha" type="date" value={form.fecha_entrega} onChange={field("fecha_entrega")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj_desc">Descripción <span className="text-xs text-muted-foreground font-normal">(opcional)</span></Label>
              <Textarea id="obj_desc" value={form.descripcion} onChange={field("descripcion")} rows={2} className="resize-none" />
            </div>
          </div>
          {serverError && <p className="mt-2 text-sm text-destructive" role="alert">{serverError}</p>}
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" form="obj-form" className="min-h-11" disabled={submitting}>
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear objetivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
