import type { Empleado, EmpleadoCreate, EmpleadoListResponse, EmpleadoUpdate } from "@/types/empleado"
import { apiFetch } from "@/services/api"

export async function fetchEmpleados(
  page: number,
  pageSize: number,
  search?: string,
  estado?: string,
  empresaIdOverride?: string,
): Promise<EmpleadoListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (search) params.set("search", search)
  if (estado) params.set("estado", estado)
  return apiFetch<EmpleadoListResponse>(
    `/api/empleados?${params}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

export async function fetchEmpleado(id: string): Promise<Empleado> {
  return apiFetch<Empleado>(`/api/empleados/${id}`)
}

export async function createEmpleado(data: EmpleadoCreate): Promise<Empleado> {
  return apiFetch<Empleado>("/api/empleados", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateEmpleado(id: string, data: EmpleadoUpdate): Promise<Empleado> {
  return apiFetch<Empleado>(`/api/empleados/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}
