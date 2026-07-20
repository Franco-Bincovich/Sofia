import { apiFetch } from "@/services/api"
import type {
  EmpleadoAnalisis, EmpleadoMapa,
  Hito, HitoCreate,
  PlanCarrera, PlanCarreraCreate,
} from "@/types/sucesion"

export async function fetchMapaTalento(): Promise<EmpleadoMapa[]> {
  return apiFetch<EmpleadoMapa[]>("/api/sucesion/mapa")
}

export async function fetchPlanesCarrera(): Promise<PlanCarrera[]> {
  return apiFetch<PlanCarrera[]>("/api/sucesion/planes")
}

export async function createPlanCarrera(data: PlanCarreraCreate): Promise<PlanCarrera> {
  return apiFetch<PlanCarrera>("/api/sucesion/planes", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchHitos(planId: string): Promise<Hito[]> {
  return apiFetch<Hito[]>(`/api/sucesion/planes/${planId}/hitos`)
}

export async function createHito(planId: string, data: HitoCreate): Promise<Hito> {
  return apiFetch<Hito>(`/api/sucesion/planes/${planId}/hitos`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateReadiness(planId: string, readiness: number): Promise<PlanCarrera> {
  return apiFetch<PlanCarrera>(`/api/sucesion/planes/${planId}/readiness`, {
    method: "PUT",
    body: JSON.stringify({ readiness }),
  })
}

export async function completarHito(hitoId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/sucesion/hitos/${hitoId}/completar`, {
    method: "PUT",
  })
}

export async function fetchAnalisisPosicion(
  areaId: string,
): Promise<EmpleadoAnalisis[]> {
  const params = new URLSearchParams({ area_id: areaId })
  return apiFetch<EmpleadoAnalisis[]>(`/api/sucesion/analisis?${params}`)
}
