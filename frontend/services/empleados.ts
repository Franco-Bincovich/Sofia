import type {
  Empleado, EmpleadoCreate, EmpleadoListResponse, EmpleadoSeleccionable, EmpleadoUpdate,
} from "@/types/empleado"
import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"

export async function fetchEmpleados(
  page: number,
  pageSize: number,
  search?: string,
  estado?: string,
  empresaIdOverride?: string,
  areaId?: string,
): Promise<EmpleadoListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (search) params.set("search", search)
  if (estado) params.set("estado", estado)
  if (areaId) params.set("area_id", areaId)
  return apiFetch<EmpleadoListResponse>(
    `/api/empleados?${params}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

/** Exporta el listado de empleados (pdf/excel/csv/word) con los filtros activos aplicados. */
export function exportarEmpleados(
  formato: FormatoExport,
  empresaIdOverride?: string,
  search?: string,
  estado?: string,
  areaId?: string,
): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo("/api/empleados/exportar", formato, "empleados", headers, {
    search,
    estado,
    area_id: areaId,
  })
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

export async function fetchRolesConocidos(): Promise<string[]> {
  return apiFetch<string[]>("/api/empleados/roles-conocidos")
}

export async function fetchValoresConocidos(campo: string): Promise<string[]> {
  return apiFetch<string[]>(`/api/empleados/valores-conocidos?campo=${encodeURIComponent(campo)}`)
}

export async function fetchEmpleadosSeleccionables(
  empresaId: string,
): Promise<EmpleadoSeleccionable[]> {
  return apiFetch<EmpleadoSeleccionable[]>(
    `/api/empleados/seleccionables?empresa_id=${encodeURIComponent(empresaId)}`,
  )
}
