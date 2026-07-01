import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"
import type {
  Ciclo, CicloCreate, CicloListResponse,
  CriterioCreate, Criterio,
  InstanciaCreate, InstanciaDetalle, InstanciaListResponse,
  Plantilla, PlantillaCreate, PlantillaListResponse,
  ResultadoUpdate,
} from "@/types/evaluaciones"

const BASE = "/api/evaluaciones"

// ── Plantillas ────────────────────────────────────────────────────────────────

export async function fetchPlantillas(soloActivas = true): Promise<PlantillaListResponse> {
  return apiFetch(`${BASE}/plantillas?solo_activas=${soloActivas}`)
}

export async function fetchPlantilla(id: string): Promise<Plantilla> {
  return apiFetch(`${BASE}/plantillas/${id}`)
}

export async function createPlantilla(data: PlantillaCreate): Promise<Plantilla> {
  return apiFetch(`${BASE}/plantillas`, { method: "POST", body: JSON.stringify(data) })
}

export async function updatePlantilla(id: string, data: Partial<PlantillaCreate> & { activa?: boolean }): Promise<Plantilla> {
  return apiFetch(`${BASE}/plantillas/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deletePlantilla(id: string): Promise<void> {
  await apiFetch(`${BASE}/plantillas/${id}`, { method: "DELETE" })
}

export async function addCriterio(plantillaId: string, data: CriterioCreate): Promise<Criterio> {
  return apiFetch(`${BASE}/plantillas/${plantillaId}/criterios`, {
    method: "POST", body: JSON.stringify(data),
  })
}

export async function updateCriterio(plantillaId: string, criterioId: string, data: Partial<CriterioCreate>): Promise<Criterio> {
  return apiFetch(`${BASE}/plantillas/${plantillaId}/criterios/${criterioId}`, {
    method: "PUT", body: JSON.stringify(data),
  })
}

export async function deleteCriterio(plantillaId: string, criterioId: string): Promise<void> {
  await apiFetch(`${BASE}/plantillas/${plantillaId}/criterios/${criterioId}`, { method: "DELETE" })
}

// ── Ciclos ────────────────────────────────────────────────────────────────────

export async function fetchCiclos(): Promise<CicloListResponse> {
  return apiFetch(`${BASE}/ciclos`)
}

export async function fetchCiclo(id: string): Promise<Ciclo> {
  return apiFetch(`${BASE}/ciclos/${id}`)
}

export async function createCiclo(data: CicloCreate): Promise<Ciclo> {
  return apiFetch(`${BASE}/ciclos`, { method: "POST", body: JSON.stringify(data) })
}

export async function updateCiclo(id: string, data: Partial<CicloCreate>): Promise<Ciclo> {
  return apiFetch(`${BASE}/ciclos/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function cerrarCiclo(id: string): Promise<Ciclo> {
  return apiFetch(`${BASE}/ciclos/${id}/cerrar`, { method: "POST" })
}

// ── Instancias ────────────────────────────────────────────────────────────────

export async function fetchInstancias(params?: {
  ciclo_id?: string; estado?: string
}): Promise<InstanciaListResponse> {
  const q = new URLSearchParams()
  if (params?.ciclo_id) q.set("ciclo_id", params.ciclo_id)
  if (params?.estado) q.set("estado", params.estado)
  return apiFetch(`${BASE}/instancias?${q}`)
}

export async function fetchInstancia(id: string): Promise<InstanciaDetalle> {
  return apiFetch(`${BASE}/instancias/${id}`)
}

export async function createInstancia(data: InstanciaCreate): Promise<InstanciaDetalle> {
  return apiFetch(`${BASE}/instancias`, { method: "POST", body: JSON.stringify(data) })
}

export async function updateResultado(
  instanciaId: string, criterioId: string, data: ResultadoUpdate,
): Promise<InstanciaDetalle> {
  return apiFetch(`${BASE}/instancias/${instanciaId}/resultados/${criterioId}`, {
    method: "PUT", body: JSON.stringify(data),
  })
}

export async function finalizarInstancia(id: string): Promise<InstanciaDetalle> {
  return apiFetch(`${BASE}/instancias/${id}/finalizar`, { method: "POST" })
}

// ── Export (motor genérico: pdf/excel/csv/word) ───────────────────────────────

export function exportarEvaluaciones(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo(`${BASE}/instancias/exportar`, formato, "evaluaciones_desempeno", headers)
}
