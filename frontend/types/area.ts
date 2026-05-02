export interface Area {
  id: string
  nombre: string
  descripcion: string | null
  responsable_id: string | null
  cantidad_empleados: number
  created_at: string
}

export interface AreaCreate {
  nombre: string
  descripcion?: string
}

export interface AreaUpdate {
  nombre?: string
  descripcion?: string
  responsable_id?: string
}
