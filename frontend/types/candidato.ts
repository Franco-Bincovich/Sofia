import type { EtapaPipeline } from "@/types/vacantes"

/** Candidato con el nombre del grupo resuelto (vivo o congelado). Espejo de CandidatoGrupoResponse. */
export interface CandidatoConGrupo {
  id: string
  vacante_id: string | null
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  cargo_anterior: string | null
  empresa_anterior: string | null
  etapa_pipeline: EtapaPipeline
  score_ia: number | null
  busqueda_congelada: string | null
  cv_storage_path: string | null
  created_at: string
  grupo_nombre: string | null
  busqueda_activa: boolean
}

/** Candidatos agrupados por búsqueda para la vista de la sección Candidatos. */
export interface GrupoCandidatos {
  nombre: string
  activa: boolean
  candidatos: CandidatoConGrupo[]
}
