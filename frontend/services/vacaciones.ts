import type {
  SaldoVacaciones,
  SolicitudVacaciones,
  SolicitudVacacionesCreate,
  SolicitudVacacionesListResponse,
} from "@/types/vacaciones"
import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"

export async function fetchVacaciones(
  empresaIdOverride?: string,
  areaId?: string,
): Promise<SolicitudVacacionesListResponse> {
  const params = new URLSearchParams()
  if (areaId) params.set("area_id", areaId)
  const query = params.size ? `?${params}` : ""
  return apiFetch<SolicitudVacacionesListResponse>(
    `/api/vacaciones${query}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

/** Lista las vacaciones (no canceladas) de un empleado, para su ficha. Endpoint dedicado. */
export async function fetchVacacionesEmpleado(
  empleadoId: string,
): Promise<SolicitudVacacionesListResponse> {
  return apiFetch<SolicitudVacacionesListResponse>(`/api/vacaciones/empleado/${empleadoId}`)
}

export async function fetchVacacion(id: string): Promise<SolicitudVacaciones> {
  return apiFetch<SolicitudVacaciones>(`/api/vacaciones/${id}`)
}

export async function createVacacion(
  data: SolicitudVacacionesCreate,
): Promise<SolicitudVacaciones> {
  return apiFetch<SolicitudVacaciones>("/api/vacaciones", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function cancelarVacacion(id: string): Promise<SolicitudVacaciones> {
  return apiFetch<SolicitudVacaciones>(`/api/vacaciones/${id}/cancelar`, {
    method: "PUT",
  })
}

export async function fetchSaldoVacaciones(
  empleadoId: string,
  empresaIdOverride?: string,
): Promise<SaldoVacaciones> {
  return apiFetch<SaldoVacaciones>(
    `/api/vacaciones/saldo/${empleadoId}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

/** Exporta el listado de vacaciones (pdf/excel/csv/word) vía el motor central. */
export function exportarVacaciones(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo("/api/vacaciones/exportar", formato, "vacaciones", headers)
}
