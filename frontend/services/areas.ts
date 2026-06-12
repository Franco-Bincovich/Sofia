import type { Area, AreaCreate, AreaUpdate } from "@/types/area"
import { apiFetch } from "@/services/api"

export async function fetchAreas(empresaId?: string): Promise<Area[]> {
  const params = empresaId ? `?empresa_id=${empresaId}` : ""
  return apiFetch<Area[]>(`/api/areas${params}`)
}

export async function fetchArea(id: string): Promise<Area> {
  return apiFetch<Area>(`/api/areas/${id}`)
}

export async function createArea(data: AreaCreate): Promise<Area> {
  return apiFetch<Area>("/api/areas", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateArea(id: string, data: AreaUpdate): Promise<Area> {
  return apiFetch<Area>(`/api/areas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteArea(id: string): Promise<void> {
  await apiFetch<void>(`/api/areas/${id}`, { method: "DELETE" })
}
