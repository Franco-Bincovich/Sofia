import type { Empleado, EmpleadoCreate, EmpleadoListResponse, EmpleadoUpdate } from "@/types/empleado"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function getToken(): string {
  if (typeof window === "undefined") return ""
  const raw = localStorage.getItem("session")
  if (!raw) return ""
  try {
    const parsed = JSON.parse(raw) as { access_token?: string }
    return parsed.access_token ?? ""
  } catch {
    return ""
  }
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }
}

export async function fetchEmpleados(
  page: number,
  pageSize: number,
  search?: string,
  estado?: string,
): Promise<EmpleadoListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (search) params.set("search", search)
  if (estado) params.set("estado", estado)
  const res = await fetch(`${API_BASE}/api/empleados?${params}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Error al cargar empleados")
  return res.json() as Promise<EmpleadoListResponse>
}

export async function fetchEmpleado(id: string): Promise<Empleado> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}`, { headers: authHeaders() })
  if (!res.ok) throw new Error("Error al cargar empleado")
  return res.json() as Promise<Empleado>
}

export async function createEmpleado(data: EmpleadoCreate): Promise<Empleado> {
  const res = await fetch(`${API_BASE}/api/empleados`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al crear empleado")
  return res.json() as Promise<Empleado>
}

export async function updateEmpleado(id: string, data: EmpleadoUpdate): Promise<Empleado> {
  const res = await fetch(`${API_BASE}/api/empleados/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error("Error al actualizar empleado")
  return res.json() as Promise<Empleado>
}
