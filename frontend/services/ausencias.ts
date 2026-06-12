import { apiFetch } from "@/services/api"
import type {
  Ausencia,
  AusenciaCreate,
  AusenciaListResponse,
  AusenciaUpdate,
  TipoAusencia,
  TipoAusenciaListResponse,
} from "@/types/ausencias"

export async function fetchTiposAusencia(): Promise<TipoAusenciaListResponse> {
  return apiFetch<TipoAusenciaListResponse>("/api/ausencias/tipos")
}

export async function createTipoAusencia(nombre: string): Promise<TipoAusencia> {
  return apiFetch<TipoAusencia>("/api/ausencias/tipos", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  })
}

export async function fetchAusencias(
  empresaIdOverride?: string,
  areaId?: string,
  tipoId?: string,
): Promise<AusenciaListResponse> {
  const params = new URLSearchParams()
  if (areaId) params.set("area_id", areaId)
  if (tipoId) params.set("tipo_id", tipoId)
  const query = params.size ? `?${params}` : ""
  return apiFetch<AusenciaListResponse>(
    `/api/ausencias${query}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

export async function createAusencia(data: AusenciaCreate): Promise<Ausencia> {
  return apiFetch<Ausencia>("/api/ausencias", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateAusencia(id: string, data: AusenciaUpdate): Promise<Ausencia> {
  return apiFetch<Ausencia>(`/api/ausencias/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteAusencia(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/ausencias/${id}`, { method: "DELETE" })
}

/** Genera y descarga un CSV con el listado de ausencias. Sin dependencias externas. */
export function exportAusenciasCSV(items: Ausencia[]): void {
  const headers = ["Empleado", "Área", "Empresa", "Tipo", "Desde", "Hasta", "Días", "Justificada", "Motivo"]
  const rows = items.map((a) => [
    a.empleado_nombre ?? "",
    a.area_nombre ?? "",
    a.empresa_nombre ?? "",
    a.tipo_nombre ?? "",
    a.fecha_desde,
    a.fecha_hasta,
    String(a.dias),
    a.justificada ? "Sí" : "No",
    a.motivo ?? "",
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "ausencias.csv"
  a.click()
  URL.revokeObjectURL(url)
}
