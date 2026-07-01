export interface Periodo {
  id: string
  empresa_id: string
  modulo: string | null
  desde: string
  hasta: string
  estado: string
  cerrado_por: string | null
  cerrado_at: string
  reabierto_por: string | null
  reabierto_at: string | null
}

export interface PeriodoListResponse {
  items: Periodo[]
  total: number
}
