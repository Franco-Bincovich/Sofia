import type {
  Asignacion, AsignacionCreate, AsignacionListResponse,
  DevolucionRequest, InventarioItem, InventarioItemCreate, InventarioItemUpdate,
  ItemListResponse,
} from "@/types/inventario"
import { apiFetch, descargarArchivo, type FormatoExport } from "@/services/api"

const ITEMS  = "/api/inventario/items"
const ASIG   = "/api/inventario/asignaciones"

function override(empresaId?: string): RequestInit {
  return empresaId ? { headers: { "X-Empresa-Id": empresaId } } : {}
}

export function exportarInventarioAsignaciones(formato: FormatoExport, empresaIdOverride?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo(`${ASIG}/exportar`, formato, "inventario_asignaciones", headers)
}

export function exportarInventarioItems(formato: FormatoExport, empresaIdOverride?: string, estado?: string): Promise<void> {
  const headers = empresaIdOverride ? { "X-Empresa-Id": empresaIdOverride } : undefined
  return descargarArchivo(`${ITEMS}/exportar`, formato, "inventario_items", headers, { estado })
}

export async function fetchItems(empresaIdOverride?: string, estado?: string): Promise<ItemListResponse> {
  const params = new URLSearchParams()
  if (estado) params.set("estado", estado)
  const q = params.size ? `?${params}` : ""
  return apiFetch<ItemListResponse>(`${ITEMS}${q}`, override(empresaIdOverride))
}

export async function fetchItem(id: string): Promise<InventarioItem> {
  return apiFetch<InventarioItem>(`${ITEMS}/${id}`)
}

export async function createItem(data: InventarioItemCreate): Promise<InventarioItem> {
  return apiFetch<InventarioItem>(ITEMS, { method: "POST", body: JSON.stringify(data) })
}

export async function updateItem(id: string, data: InventarioItemUpdate): Promise<InventarioItem> {
  return apiFetch<InventarioItem>(`${ITEMS}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deleteItem(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`${ITEMS}/${id}`, { method: "DELETE" })
}

export async function fetchHistorialItem(id: string): Promise<AsignacionListResponse> {
  return apiFetch<AsignacionListResponse>(`${ITEMS}/${id}/historial`)
}

export async function fetchAsignaciones(empresaIdOverride?: string, empleadoId?: string): Promise<AsignacionListResponse> {
  const params = new URLSearchParams()
  if (empleadoId) params.set("empleado_id", empleadoId)
  const q = params.size ? `?${params}` : ""
  return apiFetch<AsignacionListResponse>(`${ASIG}${q}`, override(empresaIdOverride))
}

export async function asignarItem(data: AsignacionCreate): Promise<Asignacion> {
  return apiFetch<Asignacion>(ASIG, { method: "POST", body: JSON.stringify(data) })
}

export async function devolverItem(id: string, data: DevolucionRequest): Promise<Asignacion> {
  return apiFetch<Asignacion>(`${ASIG}/${id}/devolver`, { method: "POST", body: JSON.stringify(data) })
}
