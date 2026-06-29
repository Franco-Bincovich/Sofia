export interface Empleado {
  id: string
  nombre: string
  apellido: string
  email_corporativo: string
  empresa_id: string | null
  empresa_nombre: string | null
  area_id: string
  area_nombre: string | null
  roles: string[]
  cargo?: string | null // DEPRECADO (se quita en S6); usar roles
  modalidad_trabajo: "presencial" | "remoto" | "hibrido"
  tipo_contrato: "indefinido" | "plazo_fijo" | "honorarios"
  fecha_ingreso: string
  telefono: string | null
  fecha_nacimiento: string | null
  dni: string | null
  cuil: string | null
  legajo: string | null
  estado: "activo" | "baja" | "licencia"
  dias_vacaciones_asignados: number
  // Legajo ampliado (A1)
  email_personal: string | null
  tipo_documento: string | null
  sexo: string | null
  telefono_alternativo: string | null
  domicilio: string | null
  estudios: string | null
  ubicacion: string | null
  turno: string | null
  horas_contrato: number | null
  organismo: string | null
  gerencia: string | null
  sector: string | null
  seniority: string | null
  perfil: string | null
  categoria: string | null
  modalidad_contratacion: string | null
  referido: string | null
  es_lider: boolean
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
  empresa_id: string
  nombre: string
  apellido: string
  email_corporativo: string
  area_id: string
  roles: string[]
  modalidad_trabajo: string
  tipo_contrato: string
  fecha_ingreso: string
  telefono?: string
  fecha_nacimiento?: string
  dni?: string
  cuil?: string
  legajo?: string
  cargo?: string // DEPRECADO (se quita en S6); el form ya no lo manda
  rol?: string // DEPRECADO (se quita en S6)
  dias_vacaciones_asignados?: number
  // Legajo ampliado (A1) — todos opcionales
  email_personal?: string
  tipo_documento?: string
  sexo?: string
  telefono_alternativo?: string
  domicilio?: string
  estudios?: string
  ubicacion?: string
  turno?: string
  horas_contrato?: number
  organismo?: string
  gerencia?: string
  sector?: string
  seniority?: string
  perfil?: string
  categoria?: string
  modalidad_contratacion?: string
  referido?: string
  es_lider?: boolean
}

export type EmpleadoUpdate = Partial<EmpleadoCreate> & { estado?: string }
