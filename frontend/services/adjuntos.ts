import { apiFetch, subirArchivo } from "@/services/api"
import type { Adjunto, AdjuntoListResponse } from "@/types/adjunto"

const BASE = "/api/adjuntos"

/** Lista los adjuntos activos de una entidad (empleado, vacacion, ausencia, …). */
export function fetchAdjuntos(entidad: string, entidadId: string): Promise<AdjuntoListResponse> {
  const q = new URLSearchParams({ entidad, entidad_id: entidadId })
  return apiFetch<AdjuntoListResponse>(`${BASE}?${q}`)
}

/** Sube un adjunto asociado a una entidad. categoria/descripcion son opcionales. */
export function subirAdjunto(
  entidad: string,
  entidadId: string,
  file: File,
  extra?: { categoria?: string; descripcion?: string },
): Promise<Adjunto> {
  const campos: Record<string, string> = { entidad, entidad_id: entidadId }
  if (extra?.categoria) campos.categoria = extra.categoria
  if (extra?.descripcion) campos.descripcion = extra.descripcion
  return subirArchivo<Adjunto>(BASE, file, campos)
}

/** Obtiene la URL firmada (temporal) para descargar/ver un adjunto. */
export async function getAdjuntoUrl(id: string): Promise<string> {
  const data = await apiFetch<{ url: string }>(`${BASE}/${id}/url`)
  return data.url
}

/** Elimina un adjunto (borrado lógico en el backend). */
export async function eliminarAdjunto(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`${BASE}/${id}`, { method: "DELETE" })
}

/** Marca (o desmarca) un adjunto como principal de su entidad. Desmarca los hermanos. */
export function marcarAdjuntoPrincipal(id: string, principal = true): Promise<Adjunto> {
  return apiFetch<Adjunto>(`${BASE}/${id}/principal`, {
    method: "PUT",
    body: JSON.stringify({ principal }),
  })
}
