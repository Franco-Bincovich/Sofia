// ── Vista por empresa: GET /api/organigrama ───────────────────────────────────

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

export interface EmpresaNodoAPI {
  id: string
  nombre: string
  total_empleados: number
  areas: AreaNodoAPI[]
}

// ── Vistas por proyecto: GET /api/organigrama/proyectos ───────────────────────

export interface EmpleadoProyectoNodoAPI {
  id: string
  nombre: string
  apellido: string
  iniciales: string
  cargo: string | null
  rol: string
  empleado_empresa_id: string
  empleado_empresa_nombre: string | null
  total_proyectos: number
}

export interface ProyectoOrgNodoAPI {
  id: string
  nombre: string
  estado: string
  empresa_id: string
  empresa_nombre: string | null
  total_asignados: number
  empleados: EmpleadoProyectoNodoAPI[]
}

export interface EmpresaLeyendaAPI {
  id: string
  nombre: string
}

export interface OrgProyectosResponse {
  proyectos: ProyectoOrgNodoAPI[]
  empresas_orden: EmpresaLeyendaAPI[]
}
