// Servicio de reportes de resultados de evaluaciones (lectura + export). El lote sale del
// selector de ciclo; la empresa la resuelve el header (el lote ya la fija en el backend).
import { apiFetch, descargarArchivo } from "@/services/api"
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
