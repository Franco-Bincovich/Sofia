// Tipos legacy usados por OrgNode y OrgPanel (árbol por manager)
export type AreaId = "tecnologia" | "producto" | "rrhh" | "general"
export type Modalidad = "presencial" | "remoto" | "hibrido"

export interface OrgEmployee {
  id: string
  nombre: string
  apellido: string
  cargo: string
  area: AreaId
  areaNombre: string
  email: string
  modalidad: Modalidad
}

export interface OrgTreeNode {
  employee: OrgEmployee
  children?: OrgTreeNode[]
}

// Tipos de la API real — GET /api/organigrama
export interface EmpleadoNodoAPI {
  id: string
  nombre: string
  apellido: string
  cargo: string | null
  avatar_url: string | null
}

export interface AreaNodoAPI {
  id: string
  nombre: string
  responsable: EmpleadoNodoAPI | null
  empleados: EmpleadoNodoAPI[]
  total_empleados: number
}
