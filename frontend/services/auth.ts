import { apiFetch, type Session } from "@/services/api"
import { clearSession } from "@/services/session"

export { refreshSession } from "@/services/authRefresh"

export async function login(username: string, password: string): Promise<Session> {
  return apiFetch<Session>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  })
}

/**
 * Cierra la sesión: revoca el token en Supabase vía el backend y limpia la sesión local.
 * La llamada de red es best-effort — si falla, la sesión local se limpia igual, para no
 * dejar al usuario atrapado en una sesión que no puede cerrar.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/auth/logout", { method: "POST" })
  } catch {
    // best-effort: el backend ya loguea el fallo de revocación
  } finally {
    clearSession()
  }
}
