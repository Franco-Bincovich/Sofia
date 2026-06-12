import { apiFetch } from "./api"
import type { EmpresaListResponse } from "@/types/empresa"

export interface EmpresaConfig {
  nombre: string
  logo_url: string | null
}

/** Retorna nombre y logo de la primera empresa activa. Usado en el organigrama. */
export async function fetchEmpresaConfig(): Promise<EmpresaConfig> {
  const result = await apiFetch<EmpresaListResponse>("/api/empresas")
  const first = result.items[0]
  if (!first) throw new Error("No hay empresas configuradas")
  return { nombre: first.nombre, logo_url: first.logo_url }
}
