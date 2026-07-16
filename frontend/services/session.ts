/**
 * Sesión del cliente: base de la API y persistencia del token en localStorage.
 * Módulo hoja a propósito — no importa de api.ts ni de auth.ts, para que la cadena
 * session -> authRefresh -> api -> auth quede sin ciclos.
 */
import type { Session } from "@/types/auth"

export type { Session }

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

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
