import { apiFetch } from "@/services/api"
import type { OnboardingDetalle, OnboardingInstancia } from "@/types/onboarding"

export async function fetchOnboardings(): Promise<OnboardingInstancia[]> {
  return apiFetch<OnboardingInstancia[]>("/api/onboarding")
}

export async function fetchOnboardingEmpleado(empleadoId: string): Promise<OnboardingDetalle> {
  return apiFetch<OnboardingDetalle>(`/api/onboarding/${empleadoId}`)
}

export async function iniciarOnboarding(empleadoId: string): Promise<OnboardingInstancia> {
  return apiFetch<OnboardingInstancia>(`/api/onboarding/${empleadoId}/iniciar`, {
    method: "POST",
  })
}

export async function completarTarea(instanciaId: string, tareaId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/api/onboarding/${instanciaId}/tareas/${tareaId}/completar`,
    { method: "PUT" },
  )
}
