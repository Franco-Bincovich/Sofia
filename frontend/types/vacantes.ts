export type EstadoVacante = "nueva" | "en_proceso" | "con_candidatos" | "cerrada"

export type EtapaPipeline =
  | "postulado"
  | "assessment"
  | "entrevista_rrhh"
  | "entrevista_tecnica"
  | "oferta"

export interface Vacante {
  id: string
  empresa_id: string | null
  empresa_nombre: string | null
  titulo: string
  area_id: string
  area_nombre: string | null
  descripcion: string | null
  requisitos: string[]
  tipo_contrato: string | null
  estado: EstadoVacante
  fecha_apertura: string | null
  created_at: string
  linkedin_post_id: string | null
  linkedin_url: string | null
  email_contacto: string | null
}

export interface LinkedinPublicarRequest {
  email_contacto: string
}

export interface LinkedinPublicarResponse {
  post_id: string
  url: string
  publicado_en: string
}

export interface EmailCandidato {
  email_id: string
  remitente: string
  asunto: string
  fecha: string
  cuerpo_preview: string
}

export interface VacanteCreate {
  empresa_id: string
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
