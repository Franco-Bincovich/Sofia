export interface Adjunto {
  id: string
  entidad: string
  entidad_id: string
  nombre_archivo: string
  mime_type: string | null
  tamano_bytes: number | null
  categoria: string | null
  descripcion: string | null
  es_principal: boolean | null
  subido_por: string | null
  created_at: string
}

export interface AdjuntoListResponse {
  items: Adjunto[]
  total: number
}
