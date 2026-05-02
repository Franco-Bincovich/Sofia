import type { Session } from "@/types/auth"

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
