import { apiFetch } from "./api"
import type { EmpresaNodoAPI, OrgProyectosResponse } from "@/types/organigrama"

/** Vista Empresa → Área → Empleado. Empresa filtrada por X-Empresa-Id del header. */
export function fetchOrgEmpresa(): Promise<EmpresaNodoAPI[]> {
  return apiFetch<EmpresaNodoAPI[]>("/api/organigrama")
}

/** Vistas por proyecto (árbol + cards). Filtra proyectos por empresa DUEÑA = X-Empresa-Id. */
export function fetchOrgProyectos(): Promise<OrgProyectosResponse> {
  return apiFetch<OrgProyectosResponse>("/api/organigrama/proyectos")
}
