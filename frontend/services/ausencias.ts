import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"
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

/** Exporta el listado de ausencias (pdf/excel/csv/word) vía el motor central. */
export function exportarAusencias(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo("/api/ausencias/exportar", formato, "ausencias", headers)
}
