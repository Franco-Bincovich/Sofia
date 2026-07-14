export interface Cesion {
  id: string
  empleado_id: string
  empresa_id: string
  fecha: string
  empresa_cesion: string
  created_at: string
  updated_at: string | null
}

export interface CesionListResponse {
  items: Cesion[]
  total: number
}

/** Payload de alta/edición: fecha + empresa externa (texto libre). */
export interface CesionInput {
  fecha: string
  empresa_cesion: string
}
