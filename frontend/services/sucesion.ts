import { apiFetch } from "@/services/api"
import type { EmpleadoMapa, PlanCarrera, PlanCarreraCreate } from "@/types/sucesion"

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

export async function completarHito(hitoId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/sucesion/hitos/${hitoId}/completar`, {
    method: "PUT",
  })
}
