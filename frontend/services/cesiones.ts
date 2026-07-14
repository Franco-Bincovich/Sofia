import { apiFetch, API_BASE, ApiError, authHeaders } from "@/services/api"
import type { Cesion, CesionInput, CesionListResponse } from "@/types/cesion"

/** Lista las cesiones de un empleado (el backend las ordena por fecha desc). */
export function fetchCesiones(empleadoId: string): Promise<CesionListResponse> {
  return apiFetch<CesionListResponse>(`/api/empleados/${empleadoId}/cesiones`)
}

/** Crea una cesión para el empleado. */
export function crearCesion(empleadoId: string, data: CesionInput): Promise<Cesion> {
  return apiFetch<Cesion>(`/api/empleados/${empleadoId}/cesiones`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

/** Edita una cesión existente. */
export function actualizarCesion(id: string, data: CesionInput): Promise<Cesion> {
  return apiFetch<Cesion>(`/api/cesiones/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/** Borra una cesión. El endpoint devuelve 204 (sin body) → no se parsea JSON. */
export async function eliminarCesion(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/cesiones/${id}`, { method: "DELETE", headers: authHeaders() })
  if (!res.ok) {
    let msg = "No se pudo eliminar la cesión."
    try { msg = ((await res.json()) as { message?: string }).message ?? msg } catch { /* sin body */ }
    throw new ApiError(msg, "UNKNOWN", res.status)
  }
}
