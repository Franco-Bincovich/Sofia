"use client"

import { useState, useEffect } from "react"

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createAusencia, updateAusencia } from "@/services/ausencias"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { getRol } from "@/services/permisos"
import { SeleccionEmpleado } from "@/components/features/shared/SeleccionEmpleado"
import { CamposAusencia } from "./CamposAusencia"
import { useTiposAusencia } from "./useTiposAusencia"
import {
  EMPTY_AUSENCIA, toAusenciaCreate, toAusenciaUpdate, validateAusencia,
  type AusenciaFormData, type AusenciaFormErrors,
} from "./ausenciasForm"
import type { Ausencia } from "@/types/ausencias"

interface AusenciaModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editing?: Ausencia | null
}

export function AusenciaModal({ open, onClose, onSuccess, editing }: AusenciaModalProps) {
  const isMando = getRol() === "mandos_medios"
  const [form, setForm] = useState<AusenciaFormData>(EMPTY_AUSENCIA)
  const [errors, setErrors] = useState<AusenciaFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState("")
  const { tipos, nuevoTipo, setNuevoTipo, creandoTipo, crearTipo } = useTiposAusencia(open)

  const isEditing = Boolean(editing)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setServerError("")
    if (editing) {
      setForm({
        empresa_id: editing.empresa_id, empleado_id: editing.empleado_id, tipo_id: editing.tipo_id,
        fecha_desde: editing.fecha_desde, fecha_hasta: editing.fecha_hasta,
        justificada: editing.justificada, motivo: editing.motivo ?? "",
      })
    } else {
      setForm({ ...EMPTY_AUSENCIA, empresa_id: isMando ? "" : (getEmpresaActivaId() ?? "") })
    }
  }, [open, editing, isMando])

  function field(key: keyof AusenciaFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }))
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }))
    }
  }

  function handleEmpresaChange(empresaId: string) {
    setForm((p) => ({ ...p, empresa_id: empresaId, empleado_id: "" }))
    setErrors((p) => ({ ...p, empresa_id: undefined, empleado_id: undefined }))
  }

  function handleEmpleadoChange(empleadoId: string) {
    setForm((p) => ({ ...p, empleado_id: empleadoId }))
    if (errors.empleado_id) setErrors((p) => ({ ...p, empleado_id: undefined }))
  }

  async function handleCrearTipo() {
    const created = await crearTipo()
    if (created) {
      setForm((p) => ({ ...p, tipo_id: created.id }))
      setErrors((p) => ({ ...p, tipo_id: undefined, nuevo_tipo: undefined }))
    } else if (nuevoTipo.trim()) {
      setErrors((p) => ({ ...p, nuevo_tipo: "No se pudo crear el tipo" }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateAusencia(form, !isMando)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setServerError("")
    try {
      if (isEditing) await updateAusencia(editing!.id, toAusenciaUpdate(form))
      else await createAusencia(toAusenciaCreate(form))
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
              <SeleccionEmpleado
                isMando={isMando}
                empresaId={form.empresa_id}
                empleadoId={form.empleado_id}
                onEmpresaChange={handleEmpresaChange}
                onEmpleadoChange={handleEmpleadoChange}
                errorEmpresa={errors.empresa_id}
                errorEmpleado={errors.empleado_id}
              />
            )}

            <CamposAusencia
              form={form}
              errors={errors}
              field={field}
              onJustificada={(checked) => setForm((p) => ({ ...p, justificada: checked }))}
              tipos={tipos}
              nuevoTipo={nuevoTipo}
              onNuevoTipo={setNuevoTipo}
              creandoTipo={creandoTipo}
              onCrearTipo={handleCrearTipo}
            />
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
