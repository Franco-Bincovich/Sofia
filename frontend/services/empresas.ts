import { API_BASE, apiFetch, authHeaders } from "@/services/api"
import type { Empresa, EmpresaCreate, EmpresaListResponse, EmpresaUpdate } from "@/types/empresa"

const BASE = "/api/empresas"

export async function fetchEmpresas(): Promise<EmpresaListResponse> {
  return apiFetch<EmpresaListResponse>(BASE)
}

export async function fetchEmpresa(id: string): Promise<Empresa> {
  return apiFetch<Empresa>(`${BASE}/${id}`)
}

export async function createEmpresa(data: EmpresaCreate): Promise<Empresa> {
  return apiFetch<Empresa>(BASE, { method: "POST", body: JSON.stringify(data) })
}

export async function updateEmpresa(id: string, data: EmpresaUpdate): Promise<Empresa> {
  return apiFetch<Empresa>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function toggleEmpresaActiva(id: string, activa: boolean): Promise<Empresa> {
  return apiFetch<Empresa>(`${BASE}/${id}/activa`, {
    method: "PATCH",
    body: JSON.stringify({ activa }),
  })
}

export async function uploadLogo(id: string, file: File): Promise<Empresa> {
  const form = new FormData()
  form.append("file", file)
  const headers = authHeaders()
  // Omitir Content-Type para que el browser setee el boundary multipart
  delete headers["Content-Type"]
  const res = await fetch(`${API_BASE}${BASE}/${id}/logo`, {
    method: "POST",
    headers,
    body: form,
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(body.message ?? "Error al subir el logo")
  }
  return res.json() as Promise<Empresa>
}
