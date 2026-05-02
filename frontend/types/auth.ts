export type UserRol = "admin_rrhh" | "management" | "empleado"

export interface UserInfo {
  id: string
  email: string
  username: string
  rol: UserRol
  nombre: string
  apellido: string
}

export interface Session {
  access_token: string
  refresh_token: string
  user: UserInfo
}
