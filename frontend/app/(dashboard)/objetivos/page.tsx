"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Plus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KanbanView } from "@/components/features/objetivos/KanbanView"
import { ListView } from "@/components/features/objetivos/ListView"
import { ObjetivoModal } from "@/components/features/objetivos/ObjetivoModal"
import { cambiarEstadoObjetivo, deleteObjetivo, fetchObjetivos, fetchUsuariosActivos } from "@/services/objetivos"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { EstadoObjetivo, Objetivo, UserItem } from "@/types/objetivo"
import type { Empresa } from "@/types/empresa"

type Vista = "tablero" | "lista"
const SEL = "min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export default function ObjetivosPage() {
  const [empresaActivaId] = useState<string | null>(getEmpresaActivaId)
  const [vista, setVista]           = useState<Vista>("tablero")
  const [objetivos, setObjetivos]   = useState<Objetivo[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [empresas, setEmpresas]     = useState<Empresa[]>([])
  const [usuarios, setUsuarios]     = useState<UserItem[]>([])
  const [empresaFiltro, setEmpresaFiltro]     = useState("")
  const [estadoFiltro, setEstadoFiltro]       = useState("")
  const [prioridadFiltro, setPrioridadFiltro] = useState("")
  const [responsableFiltro, setResponsableFiltro] = useState("")
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Objetivo | null>(null)
  const [moviendo, setMoviendo]     = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!empresaActivaId) fetchEmpresas().then((r) => setEmpresas(r.items.filter((e) => e.activa))).catch(() => {})
    fetchUsuariosActivos().then((r) => setUsuarios(r.items)).catch(() => {})
  }, [empresaActivaId])

  const load = useCallback(async () => {
    setLoading(true); setError(false)
    try {
      const override = !empresaActivaId && empresaFiltro ? empresaFiltro : undefined
      const data = await fetchObjetivos(override, estadoFiltro || undefined, responsableFiltro || undefined, prioridadFiltro || undefined)
      setObjetivos(data.items)
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [empresaActivaId, empresaFiltro, estadoFiltro, prioridadFiltro, responsableFiltro])

  useEffect(() => { load() }, [load])

  async function handleMover(id: string, estado: EstadoObjetivo) {
    setMoviendo(id)
    try { await cambiarEstadoObjetivo(id, { estado }); await load() }
    catch { toast.error("No se pudo mover el objetivo. Intentá de nuevo.") } finally { setMoviendo(null) }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try { await deleteObjetivo(id); await load() }
    catch { toast.error("No se pudo eliminar el objetivo. Intentá de nuevo.") } finally { setDeletingId(null) }
  }

  async function exportarTerminados() {
    const terminados = objetivos.filter((o) => o.estado === "terminado")
    if (!terminados.length) return
    const { utils, writeFile } = await import("xlsx")
    const rows = terminados.map((o) => ({
      Título:            o.titulo,
      Responsable:       o.responsable_nombre ?? "",
      Prioridad:         o.prioridad,
      Empresa:           o.empresa_nombre ?? "",
      "Fecha entrega":   o.fecha_entrega ?? "",
      "Fecha terminado": o.updated_at.slice(0, 10),
    }))
    const ws = utils.json_to_sheet(rows)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Objetivos Terminados")
    writeFile(wb, "objetivos_terminados.xlsx")
  }

  const mostrarEmpresa = !empresaActivaId
  const hayTerminados  = objetivos.some((o) => o.estado === "terminado")

  return (
    <div>
      <PageHeader title="Objetivos" description="Tablero de tareas del equipo de RRHH" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {mostrarEmpresa && empresas.length > 0 && (
            <select className={SEL} value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)} aria-label="Empresa">
              <option value="">Todas las empresas</option>
              {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          )}
          <select className={SEL} value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="por_hacer">Por hacer</option>
            <option value="haciendo">Haciendo</option>
            <option value="terminado">Terminado</option>
          </select>
          <select className={SEL} value={prioridadFiltro} onChange={(e) => setPrioridadFiltro(e.target.value)} aria-label="Prioridad">
            <option value="">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          {usuarios.length > 0 && (
            <select className={SEL} value={responsableFiltro} onChange={(e) => setResponsableFiltro(e.target.value)} aria-label="Responsable">
              <option value="">Todos los responsables</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {hayTerminados && (
            <Button variant="outline" className="min-h-11 gap-2" onClick={exportarTerminados}>
              <Download className="size-4" /> Exportar terminados
            </Button>
          )}
          <Button className="min-h-11 gap-2" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="size-4" /> Nuevo objetivo
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-1 border-b border-border">
        {(["tablero", "lista"] as Vista[]).map((v) => (
          <button key={v} onClick={() => setVista(v)}
            className={cn("px-4 pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              vista === v ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>
            {v === "tablero" ? "Tablero" : "Lista"}
          </button>
        ))}
      </div>

      {loading && <TableSkeleton />}
      {!loading && error && <div className="py-12 text-center text-sm text-destructive">Error al cargar. <button onClick={load} className="underline">Reintentar</button></div>}
      {!loading && !error && vista === "tablero" && (
        <KanbanView objetivos={objetivos} onMover={handleMover} moviendo={moviendo}
          onEdit={(o) => { setEditing(o); setModalOpen(true) }} onDelete={handleDelete} deletingId={deletingId} />
      )}
      {!loading && !error && vista === "lista" && (
        <ListView objetivos={objetivos} showEmpresa={mostrarEmpresa}
          onEdit={(o) => { setEditing(o); setModalOpen(true) }} onDelete={handleDelete} deletingId={deletingId} />
      )}

      <ObjetivoModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }}
        onSuccess={() => { setModalOpen(false); setEditing(null); load() }} editing={editing} />
    </div>
  )
}
