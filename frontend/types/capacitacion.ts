export interface Capacitacion {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  nombre: string
  descripcion: string | null
  categoria: string | null
  duracion_horas: number | null
  obligatoria: boolean
  activo: boolean
  created_at: string
}

export interface CapacitacionCreate {
  empresa_id: string
  nombre: string
  descripcion?: string
  categoria?: string
  duracion_horas?: number
  obligatoria: boolean
}

export interface CapacitacionUpdate {
  nombre?: string
  descripcion?: string
  categoria?: string
  duracion_horas?: number
  obligatoria?: boolean
  activo?: boolean
}

export interface CapacitacionListResponse {
  items: Capacitacion[]
  total: number
}

export interface Asignacion {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  capacitacion_id: string
  capacitacion_nombre: string | null
  empleado_id: string
  empleado_nombre: string | null
  area_id: string | null
  area_nombre: string | null
  estado: "pendiente" | "en_curso" | "completado"
  fecha_asignacion: string | null   // "YYYY-MM-DD"
  fecha_limite: string | null
  fecha_completado: string | null
  certificado_url: string | null    // storage path (privado) — usar signed URL para descargar
  created_at: string
}

export interface AsignacionCreate {
  capacitacion_id: string
  empleado_id: string
  fecha_asignacion?: string
  fecha_limite?: string
}

export interface AsignacionUpdate {
  estado?: "pendiente" | "en_curso" | "completado"
  fecha_limite?: string
  fecha_completado?: string
}

export interface AsignacionListResponse {
  items: Asignacion[]
  total: number
}
