import { apiFetch } from "./api"

export interface EstadoConteo {
  estado: string
  label: string
  total: number
}

export interface ProcesoResumen {
  proceso: string
  label: string
  tabla: string
  estados: EstadoConteo[]
  total: number
}

export interface ProcesosData {
  procesos: ProcesoResumen[]
}

export function fetchProcesos(): Promise<ProcesosData> {
  return apiFetch<ProcesosData>("/api/procesos")
}
