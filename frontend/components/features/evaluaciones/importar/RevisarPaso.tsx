"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import type { Resolucion } from "@/services/evaluacionImport"
import type { EmpleadoSeleccionable } from "@/types/empleado"
import type { EstadoResolucion, PreviewResponse } from "@/types/evaluacionImport"
import { EvaluadoFila } from "./EvaluadoFila"

// Los problemáticos primero.
const ORDEN: Record<EstadoResolucion, number> = { sin_candidato: 0, ambiguo: 1, resuelto: 2 }

interface Props {
  data: PreviewResponse
  empleados: EmpleadoSeleccionable[]
  periodo: string
  confirmando: boolean
  onConfirmar: (resoluciones: Resolucion[]) => void
  onVolver: () => void
}

export function RevisarPaso({ data, empleados, periodo, confirmando, onConfirmar, onVolver }: Props) {
  const [resoluciones, setResoluciones] = useState<Resolucion[]>(
    () => data.evaluados.map((e) => ({ empleadoId: e.empleado_id ?? "", guardarEquivalencia: false })),
  )
  const [avisoPisar, setAvisoPisar] = useState(false)
  const { resumen } = data

  const ordenados = useMemo(
    () => data.evaluados.map((ev, i) => ({ ev, i })).sort((a, b) => ORDEN[a.ev.estado] - ORDEN[b.ev.estado]),
    [data.evaluados],
  )

  function set(i: number, r: Resolucion) {
    setResoluciones((prev) => prev.map((x, j) => (j === i ? r : x)))
  }

  function intentarConfirmar() {
    if (data.periodo_existe) setAvisoPisar(true)
    else onConfirmar(resoluciones)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4 text-sm">
        <span><b>{resumen.evaluados}</b> evaluados</span>
        <span className="text-emerald-600"><b>{resumen.resueltos}</b> asignados</span>
        <span className="text-amber-600"><b>{resumen.ambiguos}</b> a revisar</span>
        <span className="text-destructive"><b>{resumen.sin_candidato}</b> sin encontrar</span>
        <span><b>{resumen.resultados}</b> notas a cargar</span>
      </div>

      {data.periodo_existe && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          El período <b>{periodo}</b> ya tiene <b>{data.registros_a_pisar}</b> registros cargados.
          Al confirmar se <b>reemplazan por completo</b>.
        </div>
      )}

      {(data.problemas.length > 0 || data.anomalias.length > 0) && (
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {data.problemas.map((p, i) => (
            <p key={`p${i}`}>Fila {p.fila} ({p.archivo}): {p.motivo}</p>
          ))}
          {data.anomalias.map((a, i) => <p key={`a${i}`}>{a}</p>)}
        </div>
      )}

      <div className="space-y-2">
        {ordenados.map(({ ev, i }) => (
          <EvaluadoFila key={i} ev={ev} empleados={empleados} valor={resoluciones[i]} onChange={(r) => set(i, r)} />
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onVolver} disabled={confirmando}>Volver</Button>
        <Button onClick={intentarConfirmar} disabled={confirmando}>
          {confirmando && <Loader2 className="size-4 animate-spin" />}
          Confirmar importación
        </Button>
      </div>

      <ConfirmDialog
        open={avisoPisar}
        onClose={() => setAvisoPisar(false)}
        onConfirm={() => { setAvisoPisar(false); onConfirmar(resoluciones) }}
        title="Reemplazar el período"
        description={`El período "${periodo}" ya tiene ${data.registros_a_pisar} registros. Se van a borrar y reemplazar por los de estos archivos. ¿Continuar?`}
        confirmLabel="Sí, reemplazar"
        loading={confirmando}
      />
    </div>
  )
}
