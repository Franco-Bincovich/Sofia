import { apiFetch } from "@/services/api"

/** Usuario del sistema, para selectores (espeja GET /api/usuarios del backend). */
export interface UsuarioOption {
  id: string
  nombre: string
  apellido: string
  email: string
  rol: string
}

export interface UsuarioListResponse {
  items: UsuarioOption[]
  total: number
}

/** Lista los usuarios activos del sistema (para el selector de operador en filtros). */
export async function fetchUsuarios(): Promise<UsuarioListResponse> {
  return apiFetch<UsuarioListResponse>("/api/usuarios")
}
