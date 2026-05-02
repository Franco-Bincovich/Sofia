import type { DashboardCostos, Nomina, NominaCreate, Presupuesto, PresupuestoCreate } from "@/types/costo"
import { apiFetch } from "@/services/api"

export async function fetchDashboardCostos(mes: number, anio: number): Promise<DashboardCostos> {
  return apiFetch<DashboardCostos>(`/api/costos/dashboard?mes=${mes}&anio=${anio}`)
}

export async function fetchNominaMes(mes: number, anio: number): Promise<Nomina[]> {
  return apiFetch<Nomina[]>(`/api/costos/nomina?mes=${mes}&anio=${anio}`)
}

export async function cargarNomina(data: NominaCreate): Promise<Nomina> {
  return apiFetch<Nomina>("/api/costos/nomina", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function setPresupuesto(data: PresupuestoCreate): Promise<Presupuesto> {
  return apiFetch<Presupuesto>("/api/costos/presupuesto", {
    method: "POST",
    body: JSON.stringify(data),
  })
}
