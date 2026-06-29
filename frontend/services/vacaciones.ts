import type {
  SaldoVacaciones,
  SolicitudVacaciones,
  SolicitudVacacionesCreate,
  SolicitudVacacionesListResponse,
} from "@/types/vacaciones"
import { apiFetch } from "@/services/api"

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

/** Genera y descarga un archivo CSV con el listado de vacaciones. No requiere dependencias externas. */
export function exportVacacionesCSV(items: SolicitudVacaciones[]): void {
  const headers = ["Empleado", "Desde", "Hasta", "Días", "Estado", "Comentario"]
  const rows = items.map((v) => [
    v.empleado_nombre ?? v.empleado_id,
    v.fecha_desde,
    v.fecha_hasta,
    String(v.dias),
    v.estado,
    v.comentario ?? "",
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "vacaciones.csv"
  a.click()
  URL.revokeObjectURL(url)
}
