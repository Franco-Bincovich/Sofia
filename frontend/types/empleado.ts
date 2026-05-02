export interface Empleado {
  id: string
  nombre: string
  apellido: string
  email_corporativo: string
  area_id: string
  cargo: string
  modalidad_trabajo: "presencial" | "remoto" | "hibrido"
  tipo_contrato: "indefinido" | "plazo_fijo" | "honorarios"
  fecha_ingreso: string
  telefono: string | null
  fecha_nacimiento: string | null
  cuil: string | null
  legajo: string | null
  estado: "activo" | "baja" | "licencia"
  created_at: string
}

export interface EmpleadoListResponse {
  items: Empleado[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface EmpleadoCreate {
  nombre: string
  apellido: string
  email_corporativo: string
  area_id: string
  cargo: string
  modalidad_trabajo: string
  tipo_contrato: string
  fecha_ingreso: string
  telefono?: string
  fecha_nacimiento?: string
  cuil?: string
  legajo?: string
}

export type EmpleadoUpdate = Partial<EmpleadoCreate> & { estado?: string }
