import type {
  CambiarEstadoRequest, Objetivo, ObjetivoCreate, ObjetivoListResponse, ObjetivoUpdate, UserItem,
} from "@/types/objetivo"
import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"

const BASE = "/api/objetivos"

export type { FormatoExport }

export function exportarObjetivos(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo(`${BASE}/exportar`, formato, "objetivos", headers)
}

function override(id?: string): RequestInit {
  return id ? { headers: { "X-Empresa-Id": id } } : {}
}

export async function fetchObjetivos(
  empresaIdOverride?: string,
  estado?: string,
  responsableId?: string,
  prioridad?: string,
): Promise<ObjetivoListResponse> {
  const params = new URLSearchParams()
  if (estado)        params.set("estado",         estado)
  if (responsableId) params.set("responsable_id", responsableId)
  if (prioridad)     params.set("prioridad",       prioridad)
  const q = params.size ? `?${params}` : ""
  return apiFetch<ObjetivoListResponse>(`${BASE}${q}`, override(empresaIdOverride))
}

export async function createObjetivo(data: ObjetivoCreate): Promise<Objetivo> {
  return apiFetch<Objetivo>(BASE, { method: "POST", body: JSON.stringify(data) })
}

export async function updateObjetivo(id: string, data: ObjetivoUpdate): Promise<Objetivo> {
  return apiFetch<Objetivo>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function cambiarEstadoObjetivo(id: string, data: CambiarEstadoRequest): Promise<Objetivo> {
  return apiFetch<Objetivo>(`${BASE}/${id}/estado`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deleteObjetivo(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`${BASE}/${id}`, { method: "DELETE" })
}

export async function fetchUsuariosActivos(): Promise<{ items: UserItem[]; total: number }> {
  return apiFetch<{ items: UserItem[]; total: number }>("/api/usuarios")
}
