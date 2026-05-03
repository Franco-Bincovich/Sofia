import { apiFetch } from "./api"

export interface EmpresaConfig {
  nombre: string
  logo_url: string | null
}

export interface EmpresaUpdate {
  nombre?: string
  logo_url?: string
}

export function fetchEmpresaConfig(): Promise<EmpresaConfig> {
  return apiFetch<EmpresaConfig>("/api/empresa")
}

export function updateEmpresaConfig(data: EmpresaUpdate): Promise<EmpresaConfig> {
  return apiFetch<EmpresaConfig>("/api/empresa", {
    method: "PUT",
    body: JSON.stringify(data),
  })
}
