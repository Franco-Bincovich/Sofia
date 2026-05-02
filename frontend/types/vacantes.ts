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
  area: string
  estado: EstadoVacante
  fechaApertura: string
  descripcion: string
  requisitos: string[]
}

export interface Candidato {
  id: string
  vacanteId: string
  nombre: string
  cargoAnterior: string
  fechaAplicacion: string
  etapa: EtapaPipeline
}
