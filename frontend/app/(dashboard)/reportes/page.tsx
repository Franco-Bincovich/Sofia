"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Users,
  RefreshCw,
  DollarSign,
  Briefcase,
  UserCheck,
  Sparkles,
  FileDown,
  FileSpreadsheet,
  CalendarDays,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  generarReporte,
  fetchHistorial,
  exportarReporte,
  type TipoReporte,
  type HistorialItem,
  type ReporteResponse,
} from "@/services/reportes"
import { getEmpresaActivaId } from "@/services/empresaStore"
import { useCanWrite } from "@/hooks/useCanWrite"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReporteEstandar {
  id: TipoReporte
  titulo: string
  descripcion: string
  icon: LucideIcon
  usaPeriodo: boolean
  usaAnio?: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

const ANO_ACTUAL = new Date().getFullYear()
const MES_ACTUAL = new Date().getMonth() + 1
const ANOS = [ANO_ACTUAL, ANO_ACTUAL - 1, ANO_ACTUAL - 2]

const REPORTES_ESTANDAR: ReporteEstandar[] = [
  {
    id: "headcount",
    titulo: "Reporte de Headcount",
    descripcion:
      "Evolución de la dotación por área, nivel y tipo de contratación. Incluye altas, bajas y transferencias del período.",
    icon: Users,
    usaPeriodo: true,
  },
  {
    id: "rotacion",
    titulo: "Reporte de Rotación",
    descripcion:
      "Índice de rotación voluntaria e involuntaria, análisis de causas de egreso y comparativa histórica por trimestre.",
    icon: RefreshCw,
    usaPeriodo: true,
  },
  {
    id: "costos",
    titulo: "Reporte de Costos",
    descripcion:
      "Nómina total y por área, desvío presupuestario, costo promedio por empleado y evolución mensual del período.",
    icon: DollarSign,
    usaPeriodo: true,
  },
  {
    id: "vacantes",
    titulo: "Reporte de Vacantes",
    descripcion:
      "Estado del pipeline de selección, tiempo promedio de cobertura, vacantes activas y cerradas por área.",
    icon: Briefcase,
    usaPeriodo: false,
  },
  {
    id: "onboarding",
    titulo: "Reporte de Onboarding",
    descripcion:
      "Completitud de tareas de inducción, tiempo promedio al primer hito productivo y encuestas de experiencia de ingreso.",
    icon: UserCheck,
    usaPeriodo: false,
  },
  {
    id: "anual_consolidado",
    titulo: "Informe Anual Consolidado",
    descripcion:
      "Resumen del año completo: ingresos, egresos, headcount por área, procesos, vacaciones, capacitaciones y evaluaciones. Exporta a Excel con múltiples hojas.",
    icon: CalendarDays,
    usaPeriodo: false,
    usaAnio: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PeriodoSelector({
  id,
  mes,
  anio,
  onMesChange,
  onAnioChange,
}: {
  id: string
  mes: number
  anio: number
  onMesChange: (mes: number) => void
  onAnioChange: (anio: number) => void
}) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label htmlFor={`mes-${id}`} className="sr-only">Mes</label>
        <select
          id={`mes-${id}`}
          value={mes}
          onChange={(e) => onMesChange(Number(e.target.value))}
          className="flex min-h-[2.75rem] w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {MESES.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label htmlFor={`anio-${id}`} className="sr-only">Año</label>
        <select
          id={`anio-${id}`}
          value={anio}
          onChange={(e) => onAnioChange(Number(e.target.value))}
          className="flex min-h-[2.75rem] w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {ANOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function AnioSelector({
  id,
  anio,
  onAnioChange,
}: {
  id: string
  anio: number
  onAnioChange: (anio: number) => void
}) {
  return (
    <div>
      <label htmlFor={`anio-solo-${id}`} className="mb-1 block text-xs font-medium text-foreground">
        Año
      </label>
      <select
        id={`anio-solo-${id}`}
        value={anio}
        onChange={(e) => onAnioChange(Number(e.target.value))}
        className="flex min-h-[2.75rem] w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {ANOS.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  )
}

function ReporteCard({
  reporte,
  canWrite,
  onSuccess,
}: {
  reporte: ReporteEstandar
  canWrite: boolean
  onSuccess: () => void
}) {
  const Icon = reporte.icon
  const [mes, setMes] = useState(MES_ACTUAL)
  const [anio, setAnio] = useState(ANO_ACTUAL)
  const [loading, setLoading] = useState(false)

  async function handleGenerar() {
    setLoading(true)
    try {
      await generarReporte({
        tipo: reporte.id,
        ...(reporte.usaPeriodo ? { mes, anio } : {}),
        ...(reporte.usaAnio ? { anio } : {}),
      })
      toast.success(`${reporte.titulo} generado exitosamente`)
      onSuccess()
    } catch {
      toast.error("No se pudo generar el reporte. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{reporte.titulo}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {reporte.descripcion}
          </p>
        </div>
      </div>

      {reporte.usaPeriodo && (
        <PeriodoSelector
          id={reporte.id}
          mes={mes}
          anio={anio}
          onMesChange={setMes}
          onAnioChange={setAnio}
        />
      )}

      {reporte.usaAnio && (
        <AnioSelector id={reporte.id} anio={anio} onAnioChange={setAnio} />
      )}

      {canWrite && (
        <Button
          variant="outline"
          size="sm"
          className="mt-auto min-h-[2.75rem] w-full"
          onClick={handleGenerar}
          disabled={loading}
        >
          {loading ? "Generando…" : "Generar"}
        </Button>
      )}
    </div>
  )
}

function ReporteAdHocCard({ canWrite, onSuccess }: { canWrite: boolean; onSuccess: (r: ReporteResponse) => void }) {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleGenerar() {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const reporte = await generarReporte({ tipo: "adhoc", prompt })
      toast.success("Análisis IA generado exitosamente")
      onSuccess(reporte)
      setPrompt("")
    } catch {
      toast.error("No se pudo generar el análisis. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border-2 border-primary bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Reporte Ad Hoc con IA</h3>
            <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              IA
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Describí en lenguaje natural el reporte que necesitás. El motor de IA de Karstec
            lo genera automáticamente consultando toda la base de datos de RRHH.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="adhoc-prompt" className="text-xs font-medium text-foreground">
          Descripción del reporte
        </label>
        <textarea
          id="adhoc-prompt"
          rows={3}
          placeholder="Ej: Quiero ver la rotación por área en los últimos 6 meses comparada con el presupuesto de headcount…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>

      {canWrite && (
        <Button
          size="sm"
          className="min-h-[2.75rem] w-full"
          disabled={!prompt.trim() || loading}
          onClick={handleGenerar}
        >
          <Sparkles className="size-4" />
          {loading ? "Generando…" : "Generar con IA"}
        </Button>
      )}
    </div>
  )
}

function TipoCell({ tipo }: { tipo: string }) {
  const isIA = tipo === "adhoc"
  return isIA ? (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">Ad Hoc IA</span>
      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
        IA
      </Badge>
    </div>
  ) : (
    <span className="text-sm capitalize text-muted-foreground">{tipo}</span>
  )
}

function AdhocResultModal({
  reporte,
  onClose,
}: {
  reporte: ReporteResponse | null
  onClose: () => void
}) {
  const analisis = reporte?.datos?.analisis as string | undefined

  return (
    <Dialog open={!!reporte} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">{reporte?.nombre ?? "Análisis IA"}</DialogTitle>
        </DialogHeader>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {analisis ?? "Sin contenido generado."}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ExportKey = `${string}-${"pdf" | "excel"}`

export default function ReportesPage() {
  const canWrite = useCanWrite()
  const [empresaActivaId] = useState<string | null>(() => getEmpresaActivaId())
  const mostrarEmpresa = !empresaActivaId

  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [historialLoading, setHistorialLoading] = useState(true)
  const [adhocReporte, setAdhocReporte] = useState<ReporteResponse | null>(null)
  const [exportLoading, setExportLoading] = useState<Set<ExportKey>>(new Set())

  const cargarHistorial = useCallback(async () => {
    setHistorialLoading(true)
    try {
      const data = await fetchHistorial()
      setHistorial(data)
    } catch {
      // no bloquear la UI si falla el historial
    } finally {
      setHistorialLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  function handleAdhocSuccess(reporte: ReporteResponse) {
    setAdhocReporte(reporte)
    cargarHistorial()
  }

  async function handleExportar(id: string, nombre: string, formato: "pdf" | "excel") {
    const key: ExportKey = `${id}-${formato}`
    setExportLoading((prev) => new Set(prev).add(key))
    try {
      await exportarReporte(id, formato, nombre)
      toast.success(`${formato.toUpperCase()} descargado`)
    } catch {
      toast.error(`No se pudo exportar el ${formato.toUpperCase()}. Intentá de nuevo.`)
    } finally {
      setExportLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reportes y Exportaciones"
        description="Generá reportes estándar o describí uno personalizado con IA"
      />

      {/* Catálogo */}
      <section aria-label="Reportes disponibles">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Reportes disponibles
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {REPORTES_ESTANDAR.map((r) => (
            <ReporteCard key={r.id} reporte={r} canWrite={canWrite} onSuccess={cargarHistorial} />
          ))}
          <ReporteAdHocCard canWrite={canWrite} onSuccess={handleAdhocSuccess} />
        </div>
      </section>

      {/* Historial */}
      <section
        className="rounded-xl border bg-card p-4 md:p-6"
        aria-label="Historial de reportes"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">Historial</h2>

        {historialLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : historial.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aún no se generaron reportes.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                {mostrarEmpresa && <TableHead>Empresa</TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Generado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historial.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  {mostrarEmpresa && (
                    <TableCell className="text-muted-foreground">
                      {r.empresa_nombre ?? <span className="italic text-muted-foreground/60">Consolidado</span>}
                    </TableCell>
                  )}
                  <TableCell>
                    <TipoCell tipo={r.tipo} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFecha(r.created_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.generado_por}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[2.75rem] gap-1.5 text-xs"
                        disabled={exportLoading.has(`${r.id}-pdf`)}
                        onClick={() => handleExportar(r.id, r.nombre, "pdf")}
                      >
                        <FileDown className="size-3.5" />
                        {exportLoading.has(`${r.id}-pdf`) ? "…" : "PDF"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[2.75rem] gap-1.5 text-xs"
                        disabled={exportLoading.has(`${r.id}-excel`)}
                        onClick={() => handleExportar(r.id, r.nombre, "excel")}
                      >
                        <FileSpreadsheet className="size-3.5" />
                        {exportLoading.has(`${r.id}-excel`) ? "…" : "Excel"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <AdhocResultModal reporte={adhocReporte} onClose={() => setAdhocReporte(null)} />
    </div>
  )
}
