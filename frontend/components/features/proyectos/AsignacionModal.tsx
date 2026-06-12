"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fetchEmpleados } from "@/services/empleados"
import type { Asignacion, AsignacionCreate, AsignacionUpdate } from "@/types/proyecto"

interface EmpleadoOption {
  id: string
  nombre: string
  apellido: string
  empresa_nombre: string | null
  estado: string
}

interface Props {
  open: boolean
  proyectoId: string
  asignacion: Asignacion | null   // null = nueva
  onClose: () => void
  onSave: (body: AsignacionCreate | AsignacionUpdate) => Promise<void>
}

const INPUT_CLS = "flex min-h-[2.75rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
const LABEL_CLS = "block text-xs font-medium text-foreground mb-1"

export function AsignacionModal({ open, asignacion, onClose, onSave }: Props) {
  const isEdit = asignacion !== null
  const [empleados, setEmpleados] = useState<EmpleadoOption[]>([])
  const [empleadoId, setEmpleadoId] = useState("")
  const [rol, setRol]               = useState("")
  const [valorHora, setValorHora]   = useState("0")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (!open) return
    // Fuerza X-Empresa-Id: todas para mostrar empleados de TODAS las empresas del grupo
    fetchEmpleados(1, 100, undefined, undefined, "todas")
      .then((r) => setEmpleados((r.items ?? []).filter((e) => e.estado !== "baja")))
      .catch(() => {})
    if (asignacion) {
      setRol(asignacion.rol)
      setValorHora(String(asignacion.valor_hora))
      setFechaDesde(asignacion.fecha_desde ?? "")
      setFechaHasta(asignacion.fecha_hasta ?? "")
    } else {
      setEmpleadoId(""); setRol(""); setValorHora("0"); setFechaDesde(""); setFechaHasta("")
    }
  }, [open, asignacion])

  async function handleSubmit() {
    if ((!isEdit && !empleadoId) || !rol.trim()) return
    setSaving(true)
    try {
      const base: AsignacionUpdate = {
        rol: rol.trim(),
        valor_hora: parseFloat(valorHora) || 0,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
      }
      await onSave(isEdit ? base : { ...base, empleado_id: empleadoId } as AsignacionCreate)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{isEdit ? "Editar asignación" : "Asignar empleado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {!isEdit && (
            <div>
              <label className={LABEL_CLS}>Empleado</label>
              <select value={empleadoId} onChange={(e) => setEmpleadoId(e.target.value)} className={INPUT_CLS}>
                <option value="">Seleccioná un empleado</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {`${e.nombre} ${e.apellido}`}{e.empresa_nombre ? ` — ${e.empresa_nombre}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Se muestran empleados de todas las empresas del grupo.</p>
            </div>
          )}
          {isEdit && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{asignacion?.empleado_nombre}</span>
              {asignacion?.empleado_empresa_nombre ? ` · ${asignacion.empleado_empresa_nombre}` : ""}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLS}>Rol en el proyecto</label>
              <input className={INPUT_CLS} value={rol} onChange={(e) => setRol(e.target.value)} placeholder="Ej: Desarrollador" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLS}>Valor/hora (ARS)</label>
              <input type="number" min="0" step="100" className={INPUT_CLS} value={valorHora}
                onChange={(e) => setValorHora(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Desde</label>
              <input type="date" className={INPUT_CLS} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Hasta</label>
              <input type="date" className={INPUT_CLS} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="min-h-[2.75rem]" onClick={onClose}>Cancelar</Button>
            <Button size="sm" className="min-h-[2.75rem]" onClick={handleSubmit}
              disabled={saving || (!isEdit && !empleadoId) || !rol.trim()}>
              {saving ? "Guardando…" : isEdit ? "Guardar" : "Asignar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
