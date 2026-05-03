import { apiFetch } from "./api"

export type TipoReporte = "headcount" | "rotacion" | "costos" | "vacantes" | "onboarding" | "adhoc"

export interface ReporteGenerarRequest {
  tipo: TipoReporte
  mes?: number
  anio?: number
  prompt?: string
}

export interface ReporteResponse {
  id: string
  nombre: string
  tipo: string
  datos: Record<string, unknown>
  generado_por: string
  created_at: string
}

export interface HistorialItem {
  id: string
  nombre: string
  tipo: string
  generado_por: string
  created_at: string
}

export function generarReporte(body: ReporteGenerarRequest): Promise<ReporteResponse> {
  return apiFetch<ReporteResponse>("/api/reportes/generar", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function fetchHistorial(): Promise<HistorialItem[]> {
  return apiFetch<HistorialItem[]>("/api/reportes/historial")
}
