import { apiFetch } from "@/services/api"
import type { EmpleadoListResponse } from "@/types/empleado"

/** Usuario del sistema, para selectores (espeja GET /api/usuarios del backend). */
export interface UsuarioOption {
  id: string
  nombre: string
  apellido: string
  email: string
  username: string
  rol: string
}

export interface UsuarioListResponse {
  items: UsuarioOption[]
  total: number
}

/** Payload de alta de un usuario mandos_medios. El rol lo fuerza el backend. */
export interface CrearUsuarioPayload {
  nombre: string
  apellido: string
  email: string
  username: string
  empleado_id?: string // opcional: vincula el user a su registro de empleado (líder)
}

/** Respuesta del alta: la contraseña temporal se muestra UNA sola vez. */
export interface CrearUsuarioResult {
  id: string
  username: string
  password_temporal: string
}

/** Empleado líder para el selector de vinculación (subconjunto de Empleado). */
export interface EmpleadoLider {
  id: string
  nombre: string
  apellido: string
  legajo: string | null
}

/** Lista los usuarios activos del sistema (para el selector de operador en filtros). */
export async function fetchUsuarios(): Promise<UsuarioListResponse> {
  return apiFetch<UsuarioListResponse>("/api/usuarios")
}

/** Crea un usuario mandos_medios; devuelve la contraseña temporal (no recuperable). */
export async function crearUsuario(payload: CrearUsuarioPayload): Promise<CrearUsuarioResult> {
  return apiFetch<CrearUsuarioResult>("/api/usuarios", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

/** Elimina un usuario del sistema por id (el backend bloquea la auto-eliminación). */
export async function eliminarUsuario(id: string): Promise<void> {
  await apiFetch<void>(`/api/usuarios/${id}`, { method: "DELETE" })
}

/** Cambia la contraseña del usuario autenticado (self-service). */
export async function cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/usuarios/cambiar-password", {
    method: "POST",
    body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
  })
}

/**
 * Empleados líderes activos para el selector de vinculación, de la empresa activa
 * (o todas si el selector global está en "todas"). Reusa GET /api/empleados con es_lider=true.
 */
export async function fetchEmpleadosLideres(): Promise<EmpleadoLider[]> {
  const res = await apiFetch<EmpleadoListResponse>(
    "/api/empleados?es_lider=true&estado=activo&page_size=100",
  )
  return res.items.map((e) => ({ id: e.id, nombre: e.nombre, apellido: e.apellido, legajo: e.legajo }))
}
