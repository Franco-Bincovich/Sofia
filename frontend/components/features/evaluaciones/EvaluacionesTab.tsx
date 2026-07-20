"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  exportarEvaluaciones, fetchCiclos, fetchInstancia, fetchInstancias,
  finalizarInstancia, updateResultado,
} from "@/services/evaluacionesService"
import { ExportMenu } from "@/components/features/export/ExportMenu"
import type { Ciclo, Instancia, InstanciaDetalle, ResultadoUpdate } from "@/types/evaluaciones"

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── Modal de evaluación ───────────────────────────────────────────────────────

interface EvaluacionFormProps { instanciaId: string; canWrite: boolean; onClose: () => void; onSaved: () => void }

function EvaluacionForm({ instanciaId, canWrite, onClose, onSaved }: EvaluacionFormProps) {
  const [instancia, setInstancia] = useState<InstanciaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [error, setError] = useState("")
  const [comentarioGeneral, setComentarioGeneral] = useState("")

  useEffect(() => {
    fetchInstancia(instanciaId)
      .then((d) => { setInstancia(d); setComentarioGeneral(d.comentario_general ?? "") })
      .catch(() => setError("No se pudo cargar la instancia"))
      .finally(() => setLoading(false))
  }, [instanciaId])

  async function handleUpdateResultado(criterioId: string, data: ResultadoUpdate) {
    if (!instancia) return
    setSaving(true)
    try {
      const updated = await updateResultado(instanciaId, criterioId, data)
      setInstancia(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally { setSaving(false) }
  }

  async function handleFinalizar() {
    if (!confirm("¿Finalizar esta evaluación? No podrás modificar los puntajes después.")) return
    setFinalizing(true)
    setError("")
    try {
      await finalizarInstancia(instanciaId)
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al finalizar")
    } finally { setFinalizing(false) }
  }

  if (loading) return <TableSkeleton />
  if (!instancia) return <div className="py-8 text-center text-destructive">{error || "No encontrada"}</div>

  const esNumerica = instancia.plantilla_tipo_escala === "numerica"
  const opciones = instancia.plantilla_opciones_cualitativas ?? []
  // solo lectura si ya está finalizada o si el rol no puede escribir
  const readOnly = instancia.estado === "finalizada" || !canWrite

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
        <span className="font-medium">{instancia.empleado_nombre}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">{instancia.ciclo_nombre}</span>
        {instancia.puntaje_global !== null && (
          <Badge className="ml-3" variant="default">
            Puntaje: {instancia.puntaje_global}
          </Badge>
        )}
      </div>

      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {[...instancia.resultados].sort((a, b) => a.criterio_orden - b.criterio_orden).map((r) => (
          <div key={r.criterio_id} className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              {r.criterio_nombre}
              <span className="ml-2 text-xs font-normal text-muted-foreground">peso: {r.criterio_peso}</span>
            </p>
            {esNumerica ? (
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={instancia.plantilla_escala_min ?? 1}
                  max={instancia.plantilla_escala_max ?? 10}
                  defaultValue={r.puntaje ?? ""}
                  disabled={readOnly}
                  className="h-8 w-24"
                  onBlur={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) void handleUpdateResultado(r.criterio_id, { puntaje: val })
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  ({instancia.plantilla_escala_min}–{instancia.plantilla_escala_max})
                </span>
              </div>
            ) : (
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-60"
                defaultValue={r.valor ?? ""}
                disabled={readOnly}
                onChange={(e) => void handleUpdateResultado(r.criterio_id, { valor: e.target.value })}>
                <option value="">Seleccioná una opción</option>
                {opciones.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            <Input
              placeholder="Comentario opcional"
              defaultValue={r.comentario ?? ""}
              disabled={readOnly}
              className="mt-2 h-7 text-xs"
              onBlur={(e) => void handleUpdateResultado(r.criterio_id, { comentario: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="comentario_general">Comentario general</Label>
        <Textarea id="comentario_general" rows={2} disabled={readOnly}
          value={comentarioGeneral}
          onChange={(e) => setComentarioGeneral(e.target.value)}
          onBlur={(e) => void handleUpdateResultado(instancia.resultados[0]?.criterio_id ?? "",
            { comentario: e.target.value })} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saving && <p className="text-xs text-muted-foreground">Guardando…</p>}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
        {!readOnly && (
          <Button onClick={handleFinalizar} disabled={finalizing}>
            <CheckCircle className="mr-2 size-4" />
            {finalizing ? "Finalizando…" : "Finalizar evaluación"}
          </Button>
        )}
      </DialogFooter>
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export function EvaluacionesTab({ canWrite }: { canWrite: boolean }) {
  const [instancias, setInstancias] = useState<Instancia[]>([])
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filtroCiclo, setFiltroCiclo] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [evaluandoId, setEvaluandoId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [instRes, cicloRes] = await Promise.all([
        fetchInstancias({
          ciclo_id: filtroCiclo || undefined,
          estado: filtroEstado || undefined,
        }),
        fetchCiclos(),
      ])
      setInstancias(instRes.items)
      setCiclos(cicloRes.items)
    } catch { setError("No se pudieron cargar las evaluaciones") }
    finally { setLoading(false) }
  }, [filtroCiclo, filtroEstado])

  useEffect(() => { void load() }, [load])

  if (loading) return <TableSkeleton />
  if (error) return <div className="py-12 text-center text-destructive">{error}</div>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filtroCiclo} onChange={(e) => setFiltroCiclo(e.target.value)}>
          <option value="">Todos los ciclos</option>
          {ciclos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="finalizada">Finalizada</option>
        </select>
        <div className="ml-auto">
          <ExportMenu onExport={(f) => exportarEvaluaciones(f, undefined, filtroCiclo || undefined, filtroEstado || undefined)} />
        </div>
      </div>

      {instancias.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          No hay evaluaciones con los filtros seleccionados.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Evaluador</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Puntaje global</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instancias.map((inst) => (
                <TableRow key={inst.id}>
                  <TableCell className="font-medium">{inst.empleado_nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inst.empleado_area}</TableCell>
                  <TableCell className="text-sm">{inst.ciclo_nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inst.evaluador_nombre ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={inst.estado === "finalizada" ? "default" : "secondary"}>
                      {inst.estado === "finalizada" ? "Finalizada" : "Borrador"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {inst.puntaje_global !== null
                      ? <span className="font-semibold tabular-nums">{inst.puntaje_global}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {inst.fecha_evaluacion ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEvaluandoId(inst.id)}>
                      {inst.estado === "finalizada" || !canWrite ? "Ver" : "Evaluar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!evaluandoId} onOpenChange={(o) => !o && setEvaluandoId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Evaluación de desempeño</DialogTitle></DialogHeader>
          {evaluandoId && (
            <EvaluacionForm
              instanciaId={evaluandoId}
              canWrite={canWrite}
              onClose={() => setEvaluandoId(null)}
              onSaved={() => { setEvaluandoId(null); void load() }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
