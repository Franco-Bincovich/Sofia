// Tipos de la importación de resultados de evaluaciones (preview + confirmar).
// Espejo de schemas/evaluacion_import_api.py del backend.

export type EstadoResolucion = "resuelto" | "ambiguo" | "sin_candidato"

export interface EmpleadoCandidatoDTO {
  empleado_id: string
  apellido: string
  nombre: string
  gerencia: string | null
  manager_id: string | null
  manager_apellido: string | null
  manager_nombre: string | null
  superior_coincide: boolean | null
}

export interface ResultadoParseadoDTO {
  tipo_evaluador: string
  competencia: string
  orden: number
  nota: number
}

export interface EvaluadoPreview {
  apellido_evaluado: string
  nombre_evaluado: string
  apellido_superior: string | null
  nombre_superior: string | null
  organismo: string | null
  gerencia: string | null
  sector: string | null
  perfil: string
  nota_final: number | null
  estado: EstadoResolucion
  empleado_id: string | null
  fuente: string | null
  motivo: string | null
  candidatos: EmpleadoCandidatoDTO[]
  resultados: ResultadoParseadoDTO[]
}

export interface PreviewResumen {
  evaluados: number
  resueltos: number
  ambiguos: number
  sin_candidato: number
  resultados: number
}

export interface FilaProblema {
  archivo: string
  fila: number
  motivo: string
}

export interface PreviewResponse {
  resumen: PreviewResumen
  evaluados: EvaluadoPreview[]
  problemas: FilaProblema[]
  anomalias: string[]
  periodo_existe: boolean
  registros_a_pisar: number
}

export interface EvaluadoConfirm {
  apellido_evaluado: string
  nombre_evaluado: string
  apellido_superior: string | null
  nombre_superior: string | null
  organismo: string | null
  gerencia: string | null
  sector: string | null
  perfil: string
  nota_final: number | null
  empleado_id: string | null
  guardar_equivalencia: boolean
  resultados: ResultadoParseadoDTO[]
}

export interface ConfirmarResponse {
  lote_id: string
  evaluados: number
  resultados: number
  equivalencias: number
  piso_periodo_anterior: boolean
}
