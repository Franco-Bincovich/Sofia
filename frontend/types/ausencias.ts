export interface TipoAusencia {
  id: string
  nombre: string
  es_base: boolean
  activo: boolean
}

export interface TipoAusenciaListResponse {
  items: TipoAusencia[]
  total: number
}

export interface Ausencia {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  empleado_id: string
  empleado_nombre: string | null
  area_id: string | null
  area_nombre: string | null
  tipo_id: string
  tipo_nombre: string | null
  fecha_desde: string  // ISO "YYYY-MM-DD"
  fecha_hasta: string
  dias: number
  justificada: boolean
  motivo: string | null
  created_at: string
}

export interface AusenciaCreate {
  empleado_id: string
  tipo_id: string
  fecha_desde: string
  fecha_hasta: string
  justificada: boolean
  motivo?: string
}

export interface AusenciaUpdate {
  tipo_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  justificada?: boolean
  motivo?: string
}

export interface AusenciaListResponse {
  items: Ausencia[]
  total: number
}
