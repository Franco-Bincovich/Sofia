"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderKanban, Plus } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProyectoModal } from "@/components/features/proyectos/ProyectoModal"
import { fetchProyectos, createProyecto, updateProyecto } from "@/services/proyectos"
import { useCanWrite } from "@/hooks/useCanWrite"
import type { Proyecto, ProyectoCreate, ProyectoEstado, ProyectoUpdate } from "@/types/proyecto"

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
const ESTADOS: Array<ProyectoEstado | ""> = ["", "activo", "pausado", "cerrado", "cancelado"]
const ESTADO_VARIANT: Record<ProyectoEstado, "default" | "secondary" | "destructive" | "outline"> = {
  activo: "default", pausado: "outline", cerrado: "secondary", cancelado: "destructive",
}

function CosteoBar({ pct }: { pct: number | null }) {
  if (pct === null) return <p className="text-xs text-muted-foreground">Sin presupuesto</p>
  const over = pct > 100
  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className={cn("text-xs", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
        {pct.toFixed(1)}% consumido
      </p>
    </div>
  )
}

function ProyectoCard({ proyecto, canWrite, onEdit }: { proyecto: Proyecto; canWrite: boolean; onEdit: (p: Proyecto) => void }) {
  const router = useRouter()
  const { costeo } = proyecto
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{proyecto.nombre}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{proyecto.empresa_nombre}</p>
        </div>
        <Badge variant={ESTADO_VARIANT[proyecto.estado]} className="shrink-0 capitalize">{proyecto.estado}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
        <span className="text-muted-foreground">Presupuesto</span>
        <span className="text-right font-medium text-foreground">{ARS.format(proyecto.presupuesto)}</span>
        <span className="text-muted-foreground">Consumido</span>
        <span className="text-right font-medium text-foreground">{ARS.format(costeo.costo_acumulado)}</span>
        <span className="text-muted-foreground">Restante</span>
        <span className={cn("text-right font-medium", costeo.presupuesto_restante < 0 ? "text-destructive" : "text-foreground")}>
          {ARS.format(costeo.presupuesto_restante)}
        </span>
      </div>
      <CosteoBar pct={costeo.pct_consumido} />
      <div className="mt-auto flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="min-h-[2.75rem] flex-1 text-xs" onClick={() => router.push(`/proyectos/${proyecto.id}`)}>
          Ver detalle
        </Button>
        {canWrite && (
          <Button variant="ghost" size="sm" className="min-h-[2.75rem] text-xs" onClick={() => onEdit(proyecto)}>
            Editar
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ProyectosPage() {
  const canWrite = useCanWrite()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<ProyectoEstado | "">("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Proyecto | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchProyectos(filtroEstado || undefined)
      setProyectos(data.items)
    } catch { setError("No se pudieron cargar los proyectos.") }
    finally { setLoading(false) }
  }, [filtroEstado])

  useEffect(() => { load() }, [load])

  async function handleSave(body: ProyectoCreate | ProyectoUpdate) {
    try {
      if (editing) { await updateProyecto(editing.id, body as ProyectoUpdate); toast.success("Proyecto actualizado") }
      else { await createProyecto(body as ProyectoCreate); toast.success("Proyecto creado") }
      setModalOpen(false); setEditing(null); await load()
    } catch { toast.error("No se pudo guardar el proyecto.") }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Proyectos" description="Gestión de proyectos y costeo por horas" />
        {canWrite && (
          <Button size="sm" className="min-h-[2.75rem] shrink-0 gap-1.5"
            onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus className="size-4" /> Nuevo proyecto
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Estado</span>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as ProyectoEstado | "")}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
          {ESTADOS.map((e) => <option key={e} value={e}>{e === "" ? "Todos" : e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-60 rounded-xl border bg-muted" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <FolderKanban className="size-8 text-muted-foreground" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : proyectos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <FolderKanban className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No hay proyectos registrados.</p>
          {canWrite && (
            <Button size="sm" variant="outline" className="mt-1"
              onClick={() => { setEditing(null); setModalOpen(true) }}>Crear el primero</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {proyectos.map((p) => (
            <ProyectoCard key={p.id} proyecto={p} canWrite={canWrite} onEdit={(proj) => { setEditing(proj); setModalOpen(true) }} />
          ))}
        </div>
      )}

      <ProyectoModal open={modalOpen} proyecto={editing}
        onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} />
    </div>
  )
}
