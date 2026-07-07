import type { TipoVacacion } from "@/types/vacaciones"

/** Shape del form de alta de vacaciones + constantes y validación puras (sin JSX). */
export type VacacionFormData = {
  empresa_id: string
  empleado_id: string
  tipo: TipoVacacion
  fecha_desde: string
  fecha_hasta: string
  comentario: string
}

export type VacacionFormErrors = Partial<Record<keyof VacacionFormData, string>>

export const EMPTY_VACACION: VacacionFormData = {
  empresa_id: "", empleado_id: "", tipo: "vacaciones",
  fecha_desde: "", fecha_hasta: "", comentario: "",
}

export const TIPOS_VACACION: { value: TipoVacacion; label: string }[] = [
  { value: "vacaciones",      label: "Vacaciones"       },
  { value: "semana_free",     label: "Semana free"      },
  { value: "dia_free",        label: "Día free"         },
  { value: "permiso_especial",label: "Permiso especial" },
]

export const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"

/** Días inclusivos entre dos fechas ISO; 0 si el rango es inválido o incompleto. */
export function calcDias(desde: string, hasta: string): number {
  if (!desde || !hasta || hasta < desde) return 0
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000) + 1
}

// mandos_medios no elige empresa (la deriva el backend del empleado); no se exige empresa_id.
export function validateVacacion(form: VacacionFormData, requireEmpresa: boolean): VacacionFormErrors {
  const errors: VacacionFormErrors = {}
  if (requireEmpresa && !form.empresa_id) errors.empresa_id = "La empresa es requerida"
  if (!form.empleado_id) errors.empleado_id = "El empleado es requerido"
  if (!form.fecha_desde) errors.fecha_desde = "La fecha de inicio es requerida"
  if (!form.fecha_hasta) errors.fecha_hasta = "La fecha de fin es requerida"
  if (form.fecha_desde && form.fecha_hasta && form.fecha_hasta < form.fecha_desde)
    errors.fecha_hasta = "La fecha de fin debe ser igual o posterior al inicio"
  return errors
}
