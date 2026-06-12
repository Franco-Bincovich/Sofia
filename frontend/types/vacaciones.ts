export type EstadoVacacion = "planificada" | "tomada" | "cancelada"
export type TipoVacacion = "vacaciones" | "semana_free" | "dia_free" | "permiso_especial"

export interface SolicitudVacaciones {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  empleado_id: string
  empleado_nombre: string | null
  area_id: string | null
  area_nombre: string | null
  fecha_desde: string  // ISO date "YYYY-MM-DD"
  fecha_hasta: string  // ISO date "YYYY-MM-DD"
  dias: number
  tipo: TipoVacacion
  comentario: string | null
  cancelada: boolean
  estado: EstadoVacacion  // derivado por el backend
  created_at: string
}

export interface SolicitudVacacionesCreate {
  empleado_id: string
  fecha_desde: string
  fecha_hasta: string
  tipo?: TipoVacacion
  comentario?: string
}

export interface SolicitudVacacionesListResponse {
  items: SolicitudVacaciones[]
  total: number
}

export interface SaldoVacaciones {
  empleado_id: string
  asignados: number
  gozados: number
  pedidos: number
  disponibles: number
}
