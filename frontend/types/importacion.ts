// ─── Comunes ────────────────────────────────────────────────────────────────

export interface FilaError {
  fila: number
  campo: string
  error: string
}

export interface ConfirmarError {
  fila: number
  error: string
}

// ─── Nómina de empleados (roster, 27 columnas) ──────────────────────────────

export interface FilaConFaltantes {
  fila: number
  empleado: string
  faltan: string[]
}

export interface FilaNoCargada {
  fila: number
  empleado: string
  motivo: string
}

export interface ImportacionNominaEmpleadosResult {
  total: number
  creados: number       // altas nuevas (DNI no existía)
  actualizados: number  // updates (DNI ya existía) — dedup
  cargados_ok: number   // cargados sin faltantes
  con_faltantes: FilaConFaltantes[]
  no_cargados: FilaNoCargada[]
}

// ─── Nómina de sueldos (costos_nomina) ──────────────────────────────────────

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
