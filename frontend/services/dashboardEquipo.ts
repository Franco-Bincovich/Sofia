import { apiFetch } from "@/services/api"
import type { DashboardEquipo } from "@/types/dashboardEquipo"

/** Conteos del dashboard del mando (empleados a cargo, vacaciones y ausencias del mes). */
export async function fetchDashboardEquipo(): Promise<DashboardEquipo> {
  return apiFetch<DashboardEquipo>("/api/dashboard-equipo")
}
