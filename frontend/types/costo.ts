export interface NominaCreate {
  empleado_id: string
  mes: number
  anio: number
  monto_bruto: number
  monto_neto: number
}

export interface Nomina {
  id: string
  empleado_id: string
  empleado_nombre: string
  area_nombre: string
  mes: number
  anio: number
  monto_bruto: number
  monto_neto: number
  total: number
}

export interface PresupuestoCreate {
  area_id: string
  mes: number
  anio: number
  presupuesto: number
}

export interface Presupuesto {
  id: string
  area_id: string
  area_nombre: string
  mes: number
  anio: number
  presupuesto: number
}

export interface CostoArea {
  area_nombre: string
  empleados: number
  costo_mensual: number
  presupuesto: number
}

export interface EvolucionMes {
  mes: number
  anio: number
  total: number
}

export interface DashboardCostos {
  total_nomina: number
  costo_promedio: number
  variacion_porcentual: number | null
  costos_por_area: CostoArea[]
  evolucion_mensual: EvolucionMes[]
}
