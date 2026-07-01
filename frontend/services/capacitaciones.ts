import { API_BASE, apiFetch, authHeaders, descargarArchivo, type FormatoExport } from "@/services/api"
import type {
  Asignacion,
  AsignacionCreate,
  AsignacionListResponse,
  AsignacionUpdate,
  Capacitacion,
  CapacitacionCreate,
  CapacitacionListResponse,
  CapacitacionUpdate,
} from "@/types/capacitacion"

const BASE = "/api/capacitaciones"
const BASE_AS = `${BASE}/asignaciones`

// ── Catálogo ──────────────────────────────────────────────────────────────────

export async function fetchCapacitaciones(
  empresaIdOverride?: string,
  soloActivos = true,
): Promise<CapacitacionListResponse> {
  const q = new URLSearchParams({ solo_activos: String(soloActivos) })
  return apiFetch<CapacitacionListResponse>(
    `${BASE}?${q}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

export async function createCapacitacion(data: CapacitacionCreate): Promise<Capacitacion> {
  return apiFetch<Capacitacion>(BASE, { method: "POST", body: JSON.stringify(data) })
}

export async function updateCapacitacion(id: string, data: CapacitacionUpdate): Promise<Capacitacion> {
  return apiFetch<Capacitacion>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deleteCapacitacion(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`${BASE}/${id}`, { method: "DELETE" })
}

// ── Asignaciones ──────────────────────────────────────────────────────────────

export async function fetchAsignaciones(params: {
  empresaIdOverride?: string
  empleadoId?: string
  capacitacionId?: string
  estado?: string
  areaId?: string
}): Promise<AsignacionListResponse> {
  const q = new URLSearchParams()
  if (params.empleadoId) q.set("empleado_id", params.empleadoId)
  if (params.capacitacionId) q.set("capacitacion_id", params.capacitacionId)
  if (params.estado) q.set("estado", params.estado)
  if (params.areaId) q.set("area_id", params.areaId)
  const query = q.size ? `?${q}` : ""
  return apiFetch<AsignacionListResponse>(
    `${BASE_AS}${query}`,
    params.empresaIdOverride ? { headers: { "X-Empresa-Id": params.empresaIdOverride } } : {},
  )
}

export async function createAsignacion(data: AsignacionCreate): Promise<Asignacion> {
  return apiFetch<Asignacion>(BASE_AS, { method: "POST", body: JSON.stringify(data) })
}

export async function updateAsignacion(id: string, data: AsignacionUpdate): Promise<Asignacion> {
  return apiFetch<Asignacion>(`${BASE_AS}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deleteAsignacion(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`${BASE_AS}/${id}`, { method: "DELETE" })
}

export async function uploadCertificado(id: string, file: File): Promise<Asignacion> {
  const form = new FormData()
  form.append("file", file)
  const headers = authHeaders()
  delete headers["Content-Type"]
  const res = await fetch(`${API_BASE}${BASE_AS}/${id}/certificado`, {
    method: "POST",
    headers,
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? "Error al subir el certificado")
  }
  return res.json() as Promise<Asignacion>
}

export async function getCertificadoUrl(id: string): Promise<string> {
  const data = await apiFetch<{ url: string }>(`${BASE_AS}/${id}/certificado`)
  return data.url
}

// ── Export ────────────────────────────────────────────────────────────────────

/** Exporta el listado de asignaciones de capacitación (pdf/excel/csv/word) vía el motor central. */
export function exportarCapacitaciones(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo("/api/capacitaciones/asignaciones/exportar", formato, "capacitaciones", headers)
}
