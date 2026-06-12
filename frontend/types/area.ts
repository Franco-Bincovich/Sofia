export interface Area {
  id: string
  empresa_id: string | null
  nombre: string
  descripcion: string | null
  responsable_id: string | null
  responsable_nombre: string | null
  cantidad_empleados: number
  created_at: string
}

export interface AreaCreate {
  empresa_id: string
  nombre: string
  descripcion?: string
  responsable_id?: string
}

export interface AreaUpdate {
  nombre?: string
  descripcion?: string
  responsable_id?: string
}
