import { apiFetch } from "@/services/api"
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

// ── Export Excel (client-side) ────────────────────────────────────────────────

export async function exportarEvaluaciones(instancias: import("@/types/evaluaciones").Instancia[]): Promise<void> {
  const { utils, writeFile } = await import("xlsx")
  const rows = instancias.map((i) => ({
    Empleado: i.empleado_nombre ?? "",
    Area: i.empleado_area ?? "",
    Ciclo: i.ciclo_nombre ?? "",
    Evaluador: i.evaluador_nombre ?? "",
    Estado: i.estado,
    "Puntaje global": i.puntaje_global ?? "",
    "Fecha evaluación": i.fecha_evaluacion ?? "",
  }))
  const ws = utils.json_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, "Evaluaciones")
  writeFile(wb, "evaluaciones_desempeno.xlsx")
}
