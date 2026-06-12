/**
 * Estado global de la empresa activa.
 * null = "todas las empresas" (vista consolidada, sin filtro de empresa en el backend).
 *
 * Por ahora usa localStorage para persistir entre recargas, consistente con el manejo de sesión.
 */

const STORAGE_KEY = "empresa_activa_id"

/** Listeners para notificar cambios en el mismo contexto de ejecución (sin Zustand). */
type Listener = (id: string | null) => void
const listeners: Set<Listener> = new Set()

export function getEmpresaActivaId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setEmpresaActivaId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, id)
  }
  listeners.forEach((fn) => fn(id))
}

/** Suscribirse a cambios de empresa activa. Devuelve función de cleanup. */
export function subscribeEmpresaActiva(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
