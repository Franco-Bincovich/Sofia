import { apiFetch } from "./api"

export interface KPIDashboard {
  empleados_activos: number
  ingresos_mes: number
  bajas_mes: number
  costo_nomina: number
  onboardings_activos: number
  vacantes_activas: number
}

export interface AlertaDashboard {
  tipo: string
  mensaje: string
  nivel: "info" | "warning" | "error"
}

export interface HeadcountArea {
  area_id: string
  area: string
  total: number
}

export interface DashboardData {
  kpis: KPIDashboard
  headcount_por_area: HeadcountArea[]
  alertas: AlertaDashboard[]
}

export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/api/dashboard")
}
