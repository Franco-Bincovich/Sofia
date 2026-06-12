"use client"

import { useState, useCallback, useEffect } from "react"
import { Umbrella, Plus, Download } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { VacacionesModal } from "@/components/features/vacaciones/VacacionesModal"
import { MapaVacaciones } from "@/components/features/vacaciones/MapaVacaciones"
import { fetchVacaciones, cancelarVacacion, exportVacacionesCSV } from "@/services/vacaciones"
import { fetchEmpresas } from "@/services/empresas"
import { fetchAreas } from "@/services/areas"
import { getEmpresaActivaId } from "@/services/empresaStore"
import type { EstadoVacacion, SolicitudVacaciones } from "@/types/vacaciones"
import type { Empresa } from "@/types/empresa"
import type { Area } from "@/types/area"

type Vista = "lista" | "mapa"

const ESTADO_LABELS: Record<EstadoVacacion, string> = {
  planificada: "Planificada",
  tomada: "Tomada",
  cancelada: "Cancelada",
}

const ESTADO_VARIANTS: Record<EstadoVacacion, "default" | "secondary" | "outline" | "destructive"> = {
  planificada: "default",
  tomada: "secondary",
  cancelada: "destructive",
}

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

export default function VacacionesPage() {
  const [empresaActivaId, setEmpresaActivaIdLocal] = useState<string | null>(null)
  const [solicitudes, setSolicitudes] = useState<SolicitudVacaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [vista, setVista] = useState<Vista>("lista")
  const [modalOpen, setModalOpen] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // filtro de empresa en columna (solo cuando topbar = "Todas")
  const [empresaFiltro, setEmpresaFiltro] = useState("")
  const [empresas, setEmpresas] = useState<Empresa[]>([])

  // filtro de área
  const [areaFiltro, setAreaFiltro] = useState("")
  const [areas, setAreas] = useState<Area[]>([])

  // filtro de estado (aplicado en frontend sobre los datos recibidos)
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoVacacion | "">("")

  // ── Inicialización ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = getEmpresaActivaId()
    setEmpresaActivaIdLocal(id)
    if (!id) {
      fetchEmpresas()
        .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
        .catch(() => {})
    }
  }, [])

  // Carga áreas según la empresa efectiva (topbar > filtro columna > todas)
  useEffect(() => {
    const empId = empresaActivaId || empresaFiltro || undefined
    fetchAreas(empId)
      .then(setAreas)
      .catch(() => setAreas([]))
  }, [empresaActivaId, empresaFiltro])

  // ── Carga de datos ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const empresaOverride = !empresaActivaId && empresaFiltro ? empresaFiltro : undefined
      const data = await fetchVacaciones(empresaOverride, areaFiltro || undefined)
      setSolicitudes(data.items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [empresaActivaId, empresaFiltro, areaFiltro])

  useEffect(() => { load() }, [load])

  // ── Acciones ────────────────────────────────────────────────────────────────
  async function handleCancel(id: string) {
    setCancelingId(id)
    try {
      await cancelarVacacion(id)
      await load()
    } catch {
      // silencioso — el usuario puede reintentar
    } finally {
      setCancelingId(null)
    }
  }

  // El filtro de estado se aplica en el frontend (no genera un nuevo fetch)
  const filtered = estadoFiltro
    ? solicitudes.filter((s) => s.estado === estadoFiltro)
    : solicitudes

  const mostrarFiltroEmpresa = !empresaActivaId && empresas.length > 0

  // En modo "Todas" sin filtro de empresa: añadir empresa al label del área para desambiguar
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
        title="Vacaciones"
        description={loading ? "Cargando..." : `${solicitudes.length} registro${solicitudes.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex gap-2">
            {!loading && !error && solicitudes.length > 0 && (
              <Button variant="outline" className="min-h-11" onClick={() => exportVacacionesCSV(filtered)}>
                <Download className="size-4" />
                Exportar CSV
              </Button>
            )}
            <Button className="min-h-11" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Registrar vacaciones
            </Button>
          </div>
        }
      />

      {/* Controles: toggle de vista + filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <Button size="sm" variant={vista === "lista" ? "secondary" : "ghost"} onClick={() => setVista("lista")}>
            Lista
          </Button>
          <Button size="sm" variant={vista === "mapa" ? "secondary" : "ghost"} onClick={() => setVista("mapa")}>
            Mapa
          </Button>
        </div>

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

        <select
          aria-label="Filtrar por estado"
          className={SELECT_CLASS}
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value as EstadoVacacion | "")}
        >
          <option value="">Todos los estados</option>
          <option value="planificada">Planificada</option>
          <option value="tomada">Tomada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {loading && <TableSkeleton />}

      {!loading && error && <ErrorState action={load} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon={<Umbrella />}
          title="Sin resultados"
          description="No hay registros de vacaciones que coincidan con los filtros."
        />
      )}

      {!loading && !error && filtered.length > 0 && vista === "lista" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Área</TableHead>
              {!empresaActivaId && <TableHead>Empresa</TableHead>}
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
              <TableHead>Días</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.empleado_nombre ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{s.area_nombre ?? "—"}</TableCell>
                {!empresaActivaId && <TableCell className="text-muted-foreground">{s.empresa_nombre ?? "—"}</TableCell>}
                <TableCell>{formatFecha(s.fecha_desde)}</TableCell>
                <TableCell>{formatFecha(s.fecha_hasta)}</TableCell>
                <TableCell>{s.dias}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANTS[s.estado]}>{ESTADO_LABELS[s.estado]}</Badge>
                </TableCell>
                <TableCell>
                  {s.estado !== "cancelada" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={cancelingId === s.id}
                      onClick={() => handleCancel(s.id)}
                    >
                      {cancelingId === s.id ? "Cancelando..." : "Cancelar"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && !error && filtered.length > 0 && vista === "mapa" && (
        <MapaVacaciones solicitudes={filtered} />
      )}

      <VacacionesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load() }}
      />
    </div>
  )
}
