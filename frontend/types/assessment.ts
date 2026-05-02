export type TipoEval = "completo" | "conductual" | "cognitivo"

export interface Campana {
  id: string
  nombre: string
  tipo: TipoEval
  estado: string
  links_enviados: number
  completados: number
  created_at: string
}

export interface CampanaCreate {
  nombre: string
  tipo: TipoEval
}

export interface LinkCreate {
  campana_id: string
  evaluado_nombre: string
  evaluado_email: string
}

export interface LinkInfo {
  id: string
  campana_id: string
  token: string
  evaluado_nombre: string
  evaluado_email: string
  completado: boolean
  created_at: string
}

export interface Resultado {
  id: string
  link_id: string
  evaluado_nombre: string
  tipo: string
  fecha_completado: string | null
  perfil_dominante: string | null
  score_general: number | null
  scores: Record<string, number> | null
}

export type ResultadoDetalle = Resultado

export interface RespuestaItem {
  tipo: "self" | "cognitivo" | "tecnico"
  pregunta_id: number
  respuesta: number
}
