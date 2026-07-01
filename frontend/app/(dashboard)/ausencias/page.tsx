"use client"

import { useState, useCallback, useEffect } from "react"
import { AlertCircle, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { AusenciaModal } from "@/components/features/ausencias/AusenciaModal"
import { fetchAusencias, deleteAusencia, exportarAusencias } from "@/services/ausencias"
import { fetchTiposAusencia } from "@/services/ausencias"
import { ExportMenu } from "@/components/features/export/ExportMenu"
import { fetchEmpresas } from "@/services/empresas"
import { fetchAreas } from "@/services/areas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { useCanWrite } from "@/hooks/useCanWrite"
import type { Ausencia, TipoAusencia } from "@/types/ausencias"
import type { Empresa } from "@/types/empresa"
import type { Area } from "@/types/area"

const SELECT_CLASS =
  "min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

function formatFecha(s: string): string {
  const [y, m, d] = s.split("-")
  return `${d}/${m}/${y}`
}

export default function AusenciasPage() {
  const canWrite = useCanWrite()
  const [empresaActivaId, setEmpresaActivaIdLocal] = useState<string | null>(null)
  const [ausencias, setAusencias] = useState<Ausencia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [empresaFiltro, setEmpresaFiltro] = useState("")
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [areaFiltro, setAreaFiltro] = useState("")
  const [areas, setAreas] = useState<Area[]>([])
  const [tipoFiltro, setTipoFiltro] = useState("")
  const [tipos, setTipos] = useState<TipoAusencia[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingAusencia, setEditingAusencia] = useState<Ausencia | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Inicialización ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = getEmpresaActivaId()
    setEmpresaActivaIdLocal(id)
    if (!id) fetchEmpresas().then((r) => setEmpresas(r.items.filter((e) => e.activa))).catch(() => {})
    fetchTiposAusencia().then((r) => setTipos(r.items)).catch(() => {})
  }, [])

  useEffect(() => {
    const empId = empresaActivaId || empresaFiltro || undefined
    fetchAreas(empId).then(setAreas).catch(() => setAreas([]))
  }, [empresaActivaId, empresaFiltro])

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const override = !empresaActivaId && empresaFiltro ? empresaFiltro : undefined
      const data = await fetchAusencias(override, areaFiltro || undefined, tipoFiltro || undefined)
      setAusencias(data.items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [empresaActivaId, empresaFiltro, areaFiltro, tipoFiltro])

  useEffect(() => { load() }, [load])

  // ── Acciones ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteAusencia(id)
      await load()
    } catch {
      toast.error("No se pudo eliminar la ausencia. Intentá de nuevo.")
    } finally {
      setDeletingId(null)
    }
  }

  function handleEdit(a: Ausencia) {
    setEditingAusencia(a)
    setModalOpen(true)
  }

  function handleNew() {
    setEditingAusencia(null)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditingAusencia(null)
  }

  function handleModalSuccess() {
    handleModalClose()
    load()
  }

  const mostrarFiltroEmpresa = !empresaActivaId && empresas.length > 0

  function areaLabel(area: Area): string {
    if (!empresaActivaId && !empresaFiltro) {
      const emp = empresas.find((e) => e.id === area.empresa_id)
      return emp ? `${area.nombre} — ${emp.nombre}` : area.nombre
    }
    return area.nombre
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Ausencias"
        description={loading ? "Cargando..." : `${ausencias.length} registro${ausencias.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex gap-2">
            {!loading && !error && ausencias.length > 0 && (
              <ExportMenu onExport={(f) => exportarAusencias(f, !empresaActivaId && empresaFiltro ? empresaFiltro : undefined)} />
            )}
            {canWrite && (
              <Button className="min-h-11" onClick={handleNew}>
                <Plus className="size-4" />
                Registrar ausencia
              </Button>
            )}
          </div>
        }
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {mostrarFiltroEmpresa && (
          <select
            aria-label="Filtrar por empresa"
            className={SELECT_CLASS}
            value={empresaFiltro}
            onChange={(e) => { setEmpresaFiltro(e.target.value); setAreaFiltro("") }}
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}

        {areas.length > 0 && (
          <select
            aria-label="Filtrar por área"
            className={SELECT_CLASS}
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{areaLabel(a)}</option>)}
          </select>
        )}

        {tipos.length > 0 && (
          <select
            aria-label="Filtrar por tipo"
            className={SELECT_CLASS}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        )}
      </div>

      {loading && <TableSkeleton />}
      {!loading && error && <ErrorState action={load} />}

      {!loading && !error && ausencias.length === 0 && (
        <EmptyState
          icon={<AlertCircle />}
          title="Sin ausencias"
          description="No hay registros de ausencias que coincidan con los filtros."
        />
      )}

      {!loading && !error && ausencias.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Área</TableHead>
              {!empresaActivaId && <TableHead>Empresa</TableHead>}
              <TableHead>Tipo</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Justificada</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ausencias.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.empleado_nombre ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{a.area_nombre ?? "—"}</TableCell>
                {!empresaActivaId && <TableCell className="text-muted-foreground">{a.empresa_nombre ?? "—"}</TableCell>}
                <TableCell>{a.tipo_nombre ?? "—"}</TableCell>
                <TableCell>{formatFecha(a.fecha_desde)}</TableCell>
                <TableCell>{formatFecha(a.fecha_hasta)}</TableCell>
                <TableCell>{a.dias}</TableCell>
                <TableCell>
                  <Badge variant={a.justificada ? "secondary" : "outline"}>
                    {a.justificada ? "Sí" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                  {a.motivo ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canWrite && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(a)}
                          aria-label="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === a.id}
                          onClick={() => handleDelete(a.id)}
                          aria-label="Eliminar"
                        >
                          {deletingId === a.id ? "..." : <Trash2 className="size-3.5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AusenciaModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editing={editingAusencia}
      />
    </div>
  )
}
