import type { Session } from "@/types/auth"
import { getEmpresaActivaId } from "@/services/empresaStore"

export type { Session }

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

// ── Session helpers ────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("session")
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem("session", JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem("session")
}

// ── Request helpers ────────────────────────────────────────────────────────────

export function authHeaders(): Record<string, string> {
  const session = getSession()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`
  }
  const empresaId = getEmpresaActivaId()
  headers["X-Empresa-Id"] = empresaId ?? "todas"
  return headers
}

// ── Error type ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { message?: string; code?: string }
    return new ApiError(body.message ?? "Error del servidor", body.code ?? "UNKNOWN", res.status)
  } catch {
    return new ApiError("Error del servidor", "UNKNOWN", res.status)
  }
}

// ── Fetch wrapper ──────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) throw await toApiError(res)
  return res.json() as Promise<T>
}

// ── Subida de archivos (multipart genérico) ─────────────────────────────────────

/**
 * Sube un archivo a `path` vía multipart/form-data. Agrega `file` + cada par de `campos`
 * como campos de texto del form. Omite Content-Type a propósito: así el browser fija el
 * boundary del multipart automáticamente (no funciona si se envía application/json).
 */
export async function subirArchivo<T>(
  path: string,
  file: File,
  campos?: Record<string, string>,
): Promise<T> {
  const form = new FormData()
  form.append("file", file)
  if (campos) for (const [k, v] of Object.entries(campos)) form.append(k, v)
  return postMultipart<T>(path, form)
}

/**
 * POST multipart/form-data genérico a partir de un FormData ya armado (archivo opcional +
 * campos). Omite Content-Type a propósito: el browser fija el boundary automáticamente.
 */
export async function postMultipart<T>(path: string, form: FormData): Promise<T> {
  const headers = authHeaders()
  delete headers["Content-Type"] // el browser fija el boundary multipart
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: form })
  if (!res.ok) throw await toApiError(res)
  return res.json() as Promise<T>
}

// ── Descarga de archivos (motor de export genérico) ─────────────────────────────

export type FormatoExport = "pdf" | "excel" | "csv" | "word"

const EXPORT_EXT: Record<string, string> = { pdf: "pdf", excel: "xlsx", csv: "csv", word: "docx" }

/** Descarga el blob de `path?formato=...` y dispara la descarga con la extensión correcta. */
export async function descargarArchivo(
  path: string,
  formato: string,
  nombreBase: string,
  extraHeaders?: Record<string, string>,
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}?formato=${formato}`, {
    headers: { ...authHeaders(), ...extraHeaders },
  })
  if (!res.ok) throw await toApiError(res)
  const blob = await res.blob()
  const ext = EXPORT_EXT[formato] ?? formato
  const safe = nombreBase.replace(/[^\w\s-]/g, "").trim() || "export"
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${safe}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
