// Servicio de reportes de resultados de evaluaciones (lectura + export). El lote sale del
// selector de ciclo; la empresa la resuelve el header (el lote ya la fija en el backend).
import { apiFetch, API_BASE, ApiError, authHeaders, descargarArchivo } from "@/services/api"
import type {
  EvaluadoListadoResponse, FichaResponse, LotesResponse, MetricasResponse,
} from "@/types/evaluacionReportes"

const BASE = "/api/evaluaciones/resultados"

export interface FiltrosEvaluados {
  sector?: string
  perfil?: string
  con_nota?: string
}

export async function fetchLotesEvaluaciones(): Promise<LotesResponse> {
  return apiFetch<LotesResponse>(`${BASE}/lotes`)
}

/**
 * Elimina la importación completa: el CASCADE se lleva evaluados y resultados. Las
 * equivalencias de nombres sobreviven (cuelgan de la empresa, no del lote).
 * fetch crudo en vez de apiFetch: el endpoint responde 204 sin body.
 */
export async function deleteLoteEvaluacion(loteId: string): Promise<void> {
  const res = await fetch(`${API_BASE}${BASE}/lotes/${loteId}`, {
    method: "DELETE",
    headers: authHeaders(),
  })
  if (!res.ok) {
    let msg = "No se pudo eliminar la importación."
    try { msg = ((await res.json()) as { message?: string }).message ?? msg } catch { /* sin body */ }
    throw new ApiError(msg, "UNKNOWN", res.status)
  }
}

export async function fetchMetricas(loteId: string): Promise<MetricasResponse> {
  return apiFetch<MetricasResponse>(`${BASE}/lotes/${loteId}/metricas`)
}

export async function fetchEvaluadosResultados(loteId: string): Promise<EvaluadoListadoResponse> {
  return apiFetch<EvaluadoListadoResponse>(`${BASE}/lotes/${loteId}/evaluados`)
}

export async function fetchFicha(loteId: string, evaluadoId: string): Promise<FichaResponse> {
  return apiFetch<FichaResponse>(`${BASE}/lotes/${loteId}/evaluados/${evaluadoId}/ficha`)
}

export function exportarEvaluadosResultados(
  loteId: string, formato: string, f: FiltrosEvaluados,
): Promise<void> {
  // Mismos Query que el listado (estándar 1.2), vía descargarArchivo con params.
  return descargarArchivo(
    `${BASE}/lotes/${loteId}/evaluados/export`, formato, "evaluaciones_resultados", undefined,
    { sector: f.sector, perfil: f.perfil, con_nota: f.con_nota },
  )
}
