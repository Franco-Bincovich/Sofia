// Servicio de importación de resultados de evaluaciones: preview (multipart) + confirmar (JSON).
// El empresa_id viaja EXPLÍCITO (form/body), no por header — el import necesita una empresa concreta.
import { apiFetch, postMultipart } from "@/services/api"
import type {
  ConfirmarResponse, EvaluadoConfirm, EvaluadoPreview, PreviewResponse,
} from "@/types/evaluacionImport"

const BASE = "/api/evaluaciones/importar"

export async function previewImportEvaluaciones(
  empresaId: string, periodo: string, notas: File, desglose: File,
): Promise<PreviewResponse> {
  const form = new FormData()
  form.append("empresa_id", empresaId)
  form.append("periodo", periodo)
  form.append("notas", notas)
  form.append("desglose", desglose)
  return postMultipart<PreviewResponse>(`${BASE}/preview`, form)
}

export async function confirmarImportEvaluaciones(
  empresaId: string, periodo: string, evaluados: EvaluadoConfirm[],
): Promise<ConfirmarResponse> {
  return apiFetch<ConfirmarResponse>(`${BASE}/confirmar`, {
    method: "POST",
    body: JSON.stringify({ empresa_id: empresaId, periodo, evaluados }),
  })
}

// Resolución editable por el humano, una por evaluado (mismo índice que preview.evaluados).
export interface Resolucion {
  empleadoId: string        // "" = sin asignar
  guardarEquivalencia: boolean
}

// Combina el preview con lo que el humano ajustó → payload de confirmar.
// guardar_equivalencia solo aplica si el humano CAMBIÓ el empleado propuesto (match manual).
export function construirConfirmar(
  evaluados: EvaluadoPreview[], resoluciones: Resolucion[],
): EvaluadoConfirm[] {
  return evaluados.map((ev, i) => {
    const empleadoId = resoluciones[i]?.empleadoId || null
    const esManual = (empleadoId ?? "") !== (ev.empleado_id ?? "")
    return {
      apellido_evaluado: ev.apellido_evaluado, nombre_evaluado: ev.nombre_evaluado,
      apellido_superior: ev.apellido_superior, nombre_superior: ev.nombre_superior,
      organismo: ev.organismo, gerencia: ev.gerencia, sector: ev.sector,
      perfil: ev.perfil, nota_final: ev.nota_final, empleado_id: empleadoId,
      guardar_equivalencia: esManual && !!empleadoId && !!resoluciones[i]?.guardarEquivalencia,
      resultados: ev.resultados,
    }
  })
}
