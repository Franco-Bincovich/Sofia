export interface EmpleadoMapa {
  id: string
  nombre: string
  apellido: string
  cargo: string | null
  area_nombre: string | null
  potencial: "alto" | "medio" | "bajo"
  desempeno: "alto" | "medio" | "bajo"
}

export interface PlanCarreraCreate {
  empleado_id: string
  cargo_objetivo: string
  fecha_objetivo: string | null
  readiness: number
}

export interface PlanCarrera {
  id: string
  empleado_id: string
  empleado_nombre: string
  cargo_actual: string | null
  cargo_objetivo: string
  fecha_objetivo: string | null
  readiness: number
  hitos_completados: number
  hitos_total: number
}

export interface Hito {
  id: string
  plan_id: string
  titulo: string
  descripcion: string | null
  completado: boolean
  fecha_objetivo: string | null
}
