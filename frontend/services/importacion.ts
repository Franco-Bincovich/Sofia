import { API_BASE, ApiError, getSession } from "@/services/api"
import type {
  FilaNominaPreview,
  ImportacionNominaEmpleadosResult,
  ImportacionNominaPreview,
  ImportacionNominaResult,
} from "@/types/importacion"

async function handleResponseError(res: Response): Promise<never> {
  let body: { message?: string; code?: string } = {}
  try {
    body = (await res.json()) as { message?: string; code?: string }
  } catch { /* ignore */ }
  throw new ApiError(body.message ?? "Error del servidor", body.code ?? "UNKNOWN", res.status)
}

// ─── Nómina de empleados (roster, 27 columnas ";" latin1) ───────────────────

/** Sube el CSV de nómina de empleados: crea empleados/empresas/áreas y devuelve el reporte. */
export async function importarNominaEmpleados(file: File): Promise<ImportacionNominaEmpleadosResult> {
  const session = getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/api/importacion/nomina-empleados`, {
    method: "POST",
    headers,
    body: formData,
  })
  if (!res.ok) await handleResponseError(res)
  return res.json() as Promise<ImportacionNominaEmpleadosResult>
}

// ─── Nómina de sueldos (costos_nomina) ──────────────────────────────────────

export async function previewImportacionNominaCSV(file: File, empresaId: string): Promise<ImportacionNominaPreview> {
  const session = getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

  const formData = new FormData()
  formData.append("empresa_id", empresaId)
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/api/importacion/nomina/preview`, {
    method: "POST",
    headers,
    body: formData,
  })
  if (!res.ok) await handleResponseError(res)
  return res.json() as Promise<ImportacionNominaPreview>
}

export async function confirmarImportacionNomina(filas: FilaNominaPreview[], empresaId: string): Promise<ImportacionNominaResult> {
  const session = getSession()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

  const res = await fetch(`${API_BASE}/api/importacion/nomina/confirmar`, {
    method: "POST",
    headers,
    body: JSON.stringify({ empresa_id: empresaId, filas }),
  })
  if (!res.ok) await handleResponseError(res)
  return res.json() as Promise<ImportacionNominaResult>
}
