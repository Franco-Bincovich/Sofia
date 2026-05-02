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
import { createEmpleado, updateEmpleado } from "@/services/empleados"
import { fetchAreas } from "@/services/areas"
import type { Empleado, EmpleadoCreate } from "@/types/empleado"
import type { Area } from "@/types/area"

interface EmpleadoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  empleado?: Empleado
}

type FormData = {
  nombre: string
  apellido: string
  email_corporativo: string
  area_id: string
  cargo: string
  modalidad_trabajo: string
  tipo_contrato: string
  fecha_ingreso: string
  telefono: string
  fecha_nacimiento: string
  cuil: string
  legajo: string
  rol: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

const EMPTY: FormData = {
  nombre: "",
  apellido: "",
  email_corporativo: "",
  area_id: "",
  cargo: "",
  modalidad_trabajo: "presencial",
  tipo_contrato: "efectivo",
  fecha_ingreso: "",
  telefono: "",
  fecha_nacimiento: "",
  cuil: "",
  legajo: "",
  rol: "",
}

const TEXT_FIELDS: Array<{
  field: keyof FormData
  label: string
  required?: boolean
  type?: string
}> = [
  { field: "nombre", label: "Nombre", required: true },
  { field: "apellido", label: "Apellido", required: true },
  { field: "email_corporativo", label: "Email corporativo", required: true, type: "email" },
  { field: "cargo", label: "Cargo", required: true },
  { field: "fecha_ingreso", label: "Fecha de ingreso", required: true, type: "date" },
  { field: "telefono", label: "Teléfono", type: "tel" },
  { field: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
  { field: "cuil", label: "CUIL" },
  { field: "legajo", label: "Legajo" },
  { field: "rol", label: "Rol" },
]

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.nombre.trim()) errors.nombre = "El nombre es requerido"
  if (!form.apellido.trim()) errors.apellido = "El apellido es requerido"
  if (!form.email_corporativo.trim()) {
    errors.email_corporativo = "El email es requerido"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_corporativo)) {
    errors.email_corporativo = "El email no es válido"
  }
  if (!form.area_id) errors.area_id = "El área es requerida"
  if (!form.cargo.trim()) errors.cargo = "El cargo es requerido"
  if (!form.fecha_ingreso) errors.fecha_ingreso = "La fecha de ingreso es requerida"
  return errors
}

export function EmpleadoModal({ open, onClose, onSuccess, empleado }: EmpleadoModalProps) {
  const isEdit = Boolean(empleado)
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
    if (empleado) {
      setForm({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        email_corporativo: empleado.email_corporativo,
        area_id: empleado.area_id,
        cargo: empleado.cargo,
        modalidad_trabajo: empleado.modalidad_trabajo,
        tipo_contrato: empleado.tipo_contrato,
        fecha_ingreso: empleado.fecha_ingreso,
        telefono: empleado.telefono ?? "",
        fecha_nacimiento: empleado.fecha_nacimiento ?? "",
        cuil: empleado.cuil ?? "",
        legajo: empleado.legajo ?? "",
        rol: (empleado as Empleado & { rol?: string }).rol ?? "",
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
    setServerError("")
  }, [empleado, open])

  function field(key: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      if (isEdit && empleado) {
        await updateEmpleado(empleado.id, form)
      } else {
        const payload: EmpleadoCreate = {
          ...form,
          telefono: form.telefono || undefined,
          fecha_nacimiento: form.fecha_nacimiento || undefined,
          cuil: form.cuil || undefined,
          legajo: form.legajo || undefined,
          rol: form.rol || undefined,
        }
        await createEmpleado(payload)
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
        </DialogHeader>

        <form id="empleado-form" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
            {TEXT_FIELDS.map(({ field: key, label, required, type }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label htmlFor={key}>
                  {label}
                  {required && (
                    <span className="ml-0.5 text-destructive" aria-hidden>
                      *
                    </span>
                  )}
                </Label>
                <Input
                  id={key}
                  type={type ?? "text"}
                  value={form[key]}
                  onChange={field(key)}
                  aria-invalid={Boolean(errors[key])}
                  aria-required={required}
                />
                {errors[key] && (
                  <p className="text-xs text-destructive" role="alert">
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}

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
                <option value="">
                  {areasLoading ? "Cargando áreas..." : "Seleccionar área"}
                </option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
              {errors.area_id && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.area_id}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="modalidad_trabajo">Modalidad de trabajo</Label>
              <select
                id="modalidad_trabajo"
                className={SELECT_CLASS}
                value={form.modalidad_trabajo}
                onChange={field("modalidad_trabajo")}
              >
                <option value="presencial">Presencial</option>
                <option value="remoto">Remoto</option>
                <option value="hibrido">Híbrido</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo_contrato">Tipo de contrato</Label>
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
            <p className="mt-2 text-sm text-destructive" role="alert">
              {serverError}
            </p>
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
            form="empleado-form"
            className="min-h-11"
            disabled={submitting}
          >
            {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear empleado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
