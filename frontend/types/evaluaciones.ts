export interface Criterio {
  id: string
  plantilla_id: string
  empresa_id: string
  nombre: string
  descripcion: string | null
  peso: number
  orden: number
}

export interface Plantilla {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  nombre: string
  descripcion: string | null
  tipo_escala: "numerica" | "cualitativa"
  escala_min: number | null
  escala_max: number | null
  opciones_cualitativas: string[] | null
  activa: boolean
  area_id: string | null
  area_nombre: string | null
  criterios: Criterio[]
  created_at: string | null
}

export interface PlantillaListResponse {
  items: Plantilla[]
  total: number
}

export interface PlantillaCreate {
  empresa_id: string
  nombre: string
  descripcion?: string
  tipo_escala: "numerica" | "cualitativa"
  escala_min?: number
  escala_max?: number
  opciones_cualitativas?: string[]
  area_id?: string
}

export interface CriterioCreate {
  nombre: string
  descripcion?: string
  peso?: number
  orden?: number
}

export interface Ciclo {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  plantilla_id: string
  plantilla_nombre: string | null
  plantilla_tipo_escala: string | null
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  estado: "abierto" | "cerrado"
  total_instancias: number
}

export interface CicloListResponse {
  items: Ciclo[]
  total: number
}

export interface CicloCreate {
  plantilla_id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
}

export interface Resultado {
  id: string
  criterio_id: string
  criterio_nombre: string
  criterio_peso: number
  criterio_orden: number
  puntaje: number | null
  valor: string | null
  comentario: string | null
}

export interface Instancia {
  id: string
  empresa_id: string
  empresa_nombre: string | null
  ciclo_id: string
  ciclo_nombre: string | null
  empleado_id: string
  empleado_nombre: string | null
  empleado_area: string | null
  evaluador_id: string | null
  evaluador_nombre: string | null
  estado: "borrador" | "finalizada"
  puntaje_global: number | null
  fecha_evaluacion: string | null
}

export interface InstanciaDetalle extends Instancia {
  comentario_general: string | null
  resultados: Resultado[]
  plantilla_tipo_escala: string | null
  plantilla_opciones_cualitativas: string[] | null
  plantilla_escala_min: number | null
  plantilla_escala_max: number | null
}

export interface InstanciaListResponse {
  items: Instancia[]
  total: number
}

export interface InstanciaCreate {
  ciclo_id: string
  empleado_id: string
  evaluador_id?: string
}

export interface ResultadoUpdate {
  puntaje?: number
  valor?: string
  comentario?: string
}
