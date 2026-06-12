export interface Empresa {
  id: string
  nombre: string
  razon_social: string | null
  cuit: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  logo_url: string | null
  activa: boolean
  created_at: string
  updated_at: string | null
}

export interface EmpresaCreate {
  nombre: string
  razon_social?: string
  cuit?: string
  direccion?: string
  telefono?: string
  email?: string
  logo_url?: string
  activa?: boolean
}

export interface EmpresaUpdate {
  nombre?: string
  razon_social?: string
  cuit?: string
  direccion?: string
  telefono?: string
  email?: string
  logo_url?: string
  activa?: boolean
}

export interface EmpresaListResponse {
  items: Empresa[]
  total: number
}
