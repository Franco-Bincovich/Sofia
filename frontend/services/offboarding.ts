import { apiFetch } from "@/services/api"
import type { OffboardingCreate, OffboardingInstancia } from "@/types/offboarding"

export async function fetchOffboardings(): Promise<OffboardingInstancia[]> {
  return apiFetch<OffboardingInstancia[]>("/api/offboarding")
}

export async function iniciarOffboarding(data: OffboardingCreate): Promise<OffboardingInstancia> {
  return apiFetch<OffboardingInstancia>("/api/offboarding", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function marcarActivoDevuelto(
  instanciaId: string,
  activoId: string,
  devuelto: boolean,
): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/api/offboarding/${instanciaId}/activos/${activoId}`,
    { method: "PUT", body: JSON.stringify({ devuelto }) },
  )
}
