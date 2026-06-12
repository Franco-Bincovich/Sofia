export type EstadoObjetivo  = "por_hacer" | "haciendo" | "terminado"
export type PrioridadObjetivo = "baja" | "media" | "alta"

export interface Objetivo {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  responsable_id: string
  responsable_nombre: string | null
  titulo: string
  descripcion: string | null
  prioridad: PrioridadObjetivo
  estado: EstadoObjetivo
  fecha_entrega: string | null  // "YYYY-MM-DD"
  created_at: string
  updated_at: string
}

export interface ObjetivoCreate {
  empresa_id: string
  responsable_id: string
  titulo: string
  descripcion?: string
  prioridad: PrioridadObjetivo
  fecha_entrega?: string
}

export interface ObjetivoUpdate {
  responsable_id?: string
  titulo?: string
  descripcion?: string
  prioridad?: PrioridadObjetivo
  fecha_entrega?: string
}

export interface CambiarEstadoRequest {
  estado: EstadoObjetivo
}

export interface ObjetivoListResponse {
  items: Objetivo[]
  total: number
}

export interface UserItem {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
}
