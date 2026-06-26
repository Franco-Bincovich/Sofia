export interface FilaPreview {
  fila: number
  nombre: string
  apellido: string
  email_corporativo: string
  roles: string[]
  area_id: string
  area_nombre: string
  tipo_contrato: string
  modalidad_trabajo: string
  fecha_ingreso: string
  dni: string
  cuil: string | null
  legajo: string | null
  es_actualizacion: boolean
}

export interface FilaError {
  fila: number
  campo: string
  error: string
}

export interface ImportacionPreview {
  filas_validas: FilaPreview[]
  errores: FilaError[]
}

export interface ConfirmarError {
  fila: number
  error: string
}

export interface ImportacionResult {
  importados: number
  actualizados: number
  errores: ConfirmarError[]
}

// ─── Nómina ───────────────────────────────────────────────────────────────────

export interface FilaNominaPreview {
  fila: number
  dni: string
  nombre_empleado: string
  empleado_id: string
  anio: number
  mes: number
  salario_bruto: number
  neto: number
  es_actualizacion: boolean
}

export interface ImportacionNominaPreview {
  filas_validas: FilaNominaPreview[]
  errores: FilaError[]
}

export interface ImportacionNominaResult {
  importados: number
  actualizados: number
  errores: ConfirmarError[]
}
