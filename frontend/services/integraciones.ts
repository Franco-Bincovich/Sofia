import { apiFetch } from "@/services/api"

export interface Integracion {
  tipo: string
  email_cuenta: string | null
  activo: boolean
  connected: boolean
}

export async function fetchIntegraciones(): Promise<Integracion[]> {
  return apiFetch<Integracion[]>("/api/integraciones")
}

export async function getGoogleAuthUrl(): Promise<{ auth_url: string }> {
  return apiFetch<{ auth_url: string }>("/api/integraciones/google/auth")
}

export async function saveAnthropicKey(api_key: string): Promise<Integracion> {
  return apiFetch<Integracion>("/api/integraciones/anthropic", {
    method: "POST",
    body: JSON.stringify({ api_key }),
  })
}

export async function disconnectIntegracion(tipo: string): Promise<void> {
  await apiFetch<void>(`/api/integraciones/${tipo}`, { method: "DELETE" })
}
