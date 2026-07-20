import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"
import { subirAdjunto } from "@/services/adjuntos"
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
  empleadoId?: string,
  page = 1,
  pageSize = 20,
): Promise<AusenciaListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (areaId) params.set("area_id", areaId)
  if (empleadoId) params.set("empleado_id", empleadoId)
  if (tipoId) params.set("tipo_id", tipoId)
  const query = `?${params}`
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

/**
 * Alta de ausencia con adjuntos diferidos. Crea primero la ausencia y, con el id nuevo,
 * sube los archivos pendientes uno por uno reusando `subirAdjunto` (mismo endpoint que
 * el alta directa). No revierte: si la ausencia se creó, existe. Devuelve la ausencia y
 * cuántos adjuntos fallaron (0 = todo ok) para que la UI avise sin bloquear.
 */
export async function crearAusenciaConAdjuntos(
  data: AusenciaCreate, files: File[],
): Promise<{ ausencia: Ausencia; fallidos: number }> {
  const ausencia = await createAusencia(data)
  let fallidos = 0
  for (const file of files) {
    try {
      await subirAdjunto("ausencia", ausencia.id, file)
    } catch {
      fallidos++
    }
  }
  return { ausencia, fallidos }
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

/** Exporta el listado de ausencias (pdf/excel/csv/word) con los filtros activos aplicados. */
export function exportarAusencias(
  formato: FormatoExport,
  empresaIdOverride?: string,
  areaId?: string,
  tipoId?: string,
  empleadoId?: string,
): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo("/api/ausencias/exportar", formato, "ausencias", headers, {
    area_id: areaId,
    empleado_id: empleadoId,
    tipo_id: tipoId,
  })
}
