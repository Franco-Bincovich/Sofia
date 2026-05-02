export type EstadoVacante = "nueva" | "en_proceso" | "con_candidatos" | "cerrada"

export type EtapaPipeline =
  | "postulado"
  | "assessment"
  | "entrevista_rrhh"
  | "entrevista_tecnica"
  | "oferta"

export interface Vacante {
  id: string
  titulo: string
  area_id: string
  area_nombre: string | null
  descripcion: string | null
  requisitos: string[]
  tipo_contrato: string | null
  estado: EstadoVacante
  fecha_apertura: string | null
  created_at: string
}

export interface VacanteCreate {
  titulo: string
  area_id: string
  descripcion?: string
  requisitos: string[]
  tipo_contrato: string
}

export interface VacanteUpdate {
  titulo?: string
  area_id?: string
  descripcion?: string
  requisitos?: string[]
  tipo_contrato?: string
  estado?: EstadoVacante
}

export interface Candidato {
  id: string
  vacante_id: string
  nombre: string
  apellido: string
  email: string
  cargo_anterior: string | null
  empresa_anterior: string | null
  etapa_pipeline: EtapaPipeline
  score_ia: number | null
  created_at: string
}

export interface CandidatoCreate {
  nombre: string
  apellido: string
  email: string
  cargo_anterior?: string
  empresa_anterior?: string
  cv_url?: string
}
