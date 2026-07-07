/** Respuesta de GET /api/dashboard-equipo: 3 conteos del equipo del mando. */
export interface DashboardEquipo {
  empleados_a_cargo: number
  vacaciones_mes: number
  ausencias_mes: number
}
