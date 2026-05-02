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
