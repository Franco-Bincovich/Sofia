import { apiFetch, API_BASE } from "@/services/api"
import type { Campana, CampanaCreate, LinkCreate, LinkInfo, Resultado, ResultadoDetalle, RespuestaItem } from "@/types/assessment"

export async function fetchCampanas(): Promise<Campana[]> {
  return apiFetch<Campana[]>("/api/assessment/campanas")
}

export async function createCampana(data: CampanaCreate): Promise<Campana> {
  return apiFetch<Campana>("/api/assessment/campanas", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function createLink(campanaId: string, data: LinkCreate): Promise<LinkInfo> {
  return apiFetch<LinkInfo>(`/api/assessment/campanas/${campanaId}/links`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchEvaluacion(token: string): Promise<LinkInfo> {
  const res = await fetch(`${API_BASE}/api/assessment/evaluacion/${token}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? "Token no válido")
  }
  return res.json() as Promise<LinkInfo>
}

export async function submitEvaluacion(
  token: string,
  respuestas: RespuestaItem[],
): Promise<ResultadoDetalle> {
  const res = await fetch(`${API_BASE}/api/assessment/evaluacion/${token}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ respuestas }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? "Error al enviar respuestas")
  }
  return res.json() as Promise<ResultadoDetalle>
}

export async function fetchResultados(): Promise<Resultado[]> {
  return apiFetch<Resultado[]>("/api/assessment/resultados")
}

export async function fetchResultado(id: string): Promise<ResultadoDetalle> {
  return apiFetch<ResultadoDetalle>(`/api/assessment/resultados/${id}`)
}
