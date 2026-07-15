import type { Candidato, CandidatoCreate, EmailCandidato, EtapaPipeline, LinkedinPublicarRequest, LinkedinPublicarResponse, Vacante, VacanteCreate, VacanteUpdate } from "@/types/vacantes"
import { apiFetch, API_BASE, ApiError, authHeaders, postMultipart } from "@/services/api"

export async function fetchVacantes(estado?: string, empresaIdOverride?: string): Promise<Vacante[]> {
  const params = new URLSearchParams()
  if (estado) params.set("estado", estado)
  const query = params.toString() ? `?${params}` : ""
  return apiFetch<Vacante[]>(
    `/api/vacantes${query}`,
    empresaIdOverride ? { headers: { "X-Empresa-Id": empresaIdOverride } } : {},
  )
}

export async function fetchVacante(id: string): Promise<Vacante> {
  return apiFetch<Vacante>(`/api/vacantes/${id}`)
}

export async function createVacante(data: VacanteCreate): Promise<Vacante> {
  return apiFetch<Vacante>("/api/vacantes", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateVacante(id: string, data: VacanteUpdate): Promise<Vacante> {
  return apiFetch<Vacante>(`/api/vacantes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

/** Elimina la vacante y sus imágenes; sus candidatos sobreviven. El endpoint devuelve 204. */
export async function deleteVacante(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/vacantes/${id}`, { method: "DELETE", headers: authHeaders() })
  if (!res.ok) {
    let msg = "No se pudo eliminar la vacante."
    try { msg = ((await res.json()) as { message?: string }).message ?? msg } catch { /* sin body */ }
    throw new ApiError(msg, "UNKNOWN", res.status)
  }
}

export async function fetchCandidatos(vacanteId: string): Promise<Candidato[]> {
  return apiFetch<Candidato[]>(`/api/vacantes/${vacanteId}/candidatos`)
}

export async function createCandidato(
  vacanteId: string,
  data: CandidatoCreate,
  cv?: File | null,
): Promise<Candidato> {
  const form = new FormData()
  form.append("nombre", data.nombre)
  form.append("apellido", data.apellido)
  form.append("email", data.email)
  if (data.cargo_anterior) form.append("cargo_anterior", data.cargo_anterior)
  if (data.empresa_anterior) form.append("empresa_anterior", data.empresa_anterior)
  if (cv) form.append("cv", cv)
  return postMultipart<Candidato>(`/api/vacantes/${vacanteId}/candidatos`, form)
}

export async function moverCandidato(candidatoId: string, etapa: EtapaPipeline): Promise<Candidato> {
  return apiFetch<Candidato>(`/api/candidatos/${candidatoId}/etapa`, {
    method: "PUT",
    body: JSON.stringify({ etapa }),
  })
}

export async function publicarLinkedin(vacanteId: string, data: LinkedinPublicarRequest): Promise<LinkedinPublicarResponse> {
  return apiFetch<LinkedinPublicarResponse>(`/api/vacantes/${vacanteId}/publicar-linkedin`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchEmailsCandidatos(vacanteId: string): Promise<EmailCandidato[]> {
  return apiFetch<EmailCandidato[]>(`/api/vacantes/${vacanteId}/emails-candidatos`)
}

export async function crearCandidatoDesdeEmail(vacanteId: string, emailId: string): Promise<Candidato> {
  return apiFetch<Candidato>(`/api/vacantes/${vacanteId}/candidatos-desde-email`, {
    method: "POST",
    body: JSON.stringify({ email_id: emailId }),
  })
}
