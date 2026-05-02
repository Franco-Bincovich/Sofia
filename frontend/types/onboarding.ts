export type SeccionId = "pre-ingreso" | "semana-1" | "semana-2" | "mes-1"

export interface Tarea {
  id: string
  texto: string
  completada: boolean
}

export interface Seccion {
  id: SeccionId
  titulo: string
  tareas: Tarea[]
}

export interface EmpleadoOnboarding {
  id: string
  nombre: string
  apellido: string
  cargo: string
  area: string
  fechaIngreso: string
  semanaActual: SeccionId
  secciones: Seccion[]
}
