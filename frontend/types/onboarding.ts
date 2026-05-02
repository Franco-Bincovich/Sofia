export interface OnboardingInstancia {
  id: string
  empleado_id: string
  empleado_nombre: string
  empleado_cargo: string | null
  empleado_area: string | null
  template_id: string
  estado: string
  fecha_inicio: string
  progreso: number
  tareas_completadas: number
  tareas_total: number
}

export interface TareaProgreso {
  progreso_id: string
  tarea_id: string
  titulo: string
  descripcion: string | null
  semana: number
  orden: number
  completada: boolean
}

export interface OnboardingDetalle extends OnboardingInstancia {
  tareas: TareaProgreso[]
}
