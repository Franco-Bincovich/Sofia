export interface FilaPreview {
  fila: number
  nombre: string
  apellido: string
  email_corporativo: string
  cargo: string
  rol: string | null
  area_id: string
  area_nombre: string
  tipo_contrato: string
  modalidad_trabajo: string
  fecha_ingreso: string
  cuil: string | null
  legajo: string | null
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
  errores: ConfirmarError[]
}
