import { apiFetch } from "./api"
import type { AreaNodoAPI } from "@/types/organigrama"

export function fetchOrganigrama(): Promise<AreaNodoAPI[]> {
  return apiFetch<AreaNodoAPI[]>("/api/organigrama")
}
