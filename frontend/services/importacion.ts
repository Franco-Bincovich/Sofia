import { API_BASE, ApiError, getSession } from "@/services/api"
import type {
  FilaNominaPreview,
  FilaPreview,
  ImportacionNominaPreview,
  ImportacionNominaResult,
  ImportacionPreview,
  ImportacionResult,
} from "@/types/importacion"

async function handleResponseError(res: Response): Promise<never> {
  let body: { message?: string; code?: string } = {}
  try {
    body = (await res.json()) as { message?: string; code?: string }
  } catch { /* ignore */ }
  throw new ApiError(body.message ?? "Error del servidor", body.code ?? "UNKNOWN", res.status)
}

export async function previewImportacionCSV(file: File, empresaId: string): Promise<ImportacionPreview> {
  const session = getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

  const formData = new FormData()
  formData.append("empresa_id", empresaId)
  formData.append("file", file)

  const res = await fetch(`${API_BASE}/api/importacion/empleados/preview`, {
    method: "POST",
    headers,
    body: formData,
  })
  if (!res.ok) await handleResponseError(res)
  return res.json() as Promise<ImportacionPreview>
}

export async function confirmarImportacion(filas: FilaPreview[], empresaId: string): Promise<ImportacionResult> {
  const session = getSession()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`

  const res = await fetch(`${API_BASE}/api/importacion/empleados/confirmar`, {
    method: "POST",
    headers,
    body: JSON.stringify({ empresa_id: empresaId, filas }),
  })
  if (!res.ok) await handleResponseError(res)
  return res.json() as Promise<ImportacionResult>
}

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
