"use client"

import { useState } from "react"
import {
  Users,
  RefreshCw,
  DollarSign,
  Briefcase,
  UserCheck,
  Sparkles,
  FileDown,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReporteEstandar {
  id: string
  titulo: string
  descripcion: string
  icon: LucideIcon
}

interface ReporteHistorial {
  id: string
  nombre: string
  tipo: string
  fecha: string
  generadoPor: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const REPORTES_ESTANDAR: ReporteEstandar[] = [
  {
    id: "headcount",
    titulo: "Reporte de Headcount",
    descripcion:
      "Evolución de la dotación por área, nivel y tipo de contratación. Incluye altas, bajas y transferencias del período.",
    icon: Users,
  },
  {
    id: "rotacion",
    titulo: "Reporte de Rotación",
    descripcion:
      "Índice de rotación voluntaria e involuntaria, análisis de causas de egreso y comparativa histórica por trimestre.",
    icon: RefreshCw,
  },
  {
    id: "costos",
    titulo: "Reporte de Costos",
    descripcion:
      "Nómina total y por área, desvío presupuestario, costo promedio por empleado y evolución mensual del período.",
    icon: DollarSign,
  },
  {
    id: "vacantes",
    titulo: "Reporte de Vacantes",
    descripcion:
      "Estado del pipeline de selección, tiempo promedio de cobertura, vacantes activas y cerradas por área.",
    icon: Briefcase,
  },
  {
    id: "onboarding",
    titulo: "Reporte de Onboarding",
    descripcion:
      "Completitud de tareas de inducción, tiempo promedio al primer hito productivo y encuestas de experiencia de ingreso.",
    icon: UserCheck,
  },
]

const HISTORIAL: ReporteHistorial[] = [
  {
    id: "1",
    nombre: "Headcount — Abril 2025",
    tipo: "Headcount",
    fecha: "30/04/2025",
    generadoPor: "Ana García",
  },
  {
    id: "2",
    nombre: "Rotación Q1 2025",
    tipo: "Rotación",
    fecha: "01/04/2025",
    generadoPor: "Ana García",
  },
  {
    id: "3",
    nombre: "Costos Marzo 2025",
    tipo: "Costos",
    fecha: "31/03/2025",
    generadoPor: "Carlos López",
  },
  {
    id: "4",
    nombre: "Análisis de clima organizacional",
    tipo: "Ad Hoc IA",
    fecha: "15/03/2025",
    generadoPor: "AI HR Karstec",
  },
  {
    id: "5",
    nombre: "Vacantes Pipeline — T1 2025",
    tipo: "Vacantes",
    fecha: "03/03/2025",
    generadoPor: "Laura Méndez",
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReporteCard({ reporte }: { reporte: ReporteEstandar }) {
  const Icon = reporte.icon

  function handleGenerar() {
    console.log(`Generando reporte: ${reporte.id}`)
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
      <Button
        variant="outline"
        size="sm"
        className="mt-auto min-h-[2.75rem] w-full"
        onClick={handleGenerar}
      >
        Generar
      </Button>
    </div>
  )
}

function ReporteAdHocCard() {
  const [prompt, setPrompt] = useState("")

  function handleGenerar() {
    if (!prompt.trim()) return
    console.log(`Generando reporte Ad Hoc con IA: "${prompt}"`)
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
        <label
          htmlFor="adhoc-prompt"
          className="text-xs font-medium text-foreground"
        >
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

      <Button
        size="sm"
        className="min-h-[2.75rem] w-full"
        disabled={!prompt.trim()}
        onClick={handleGenerar}
      >
        <Sparkles className="size-4" />
        Generar con IA
      </Button>
    </div>
  )
}

function TipoCell({ tipo }: { tipo: string }) {
  const isIA = tipo === "Ad Hoc IA"
  return isIA ? (
    <div className="flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">{tipo}</span>
      <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
        IA
      </Badge>
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">{tipo}</span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  function handleDescargarPdf(reporte: ReporteHistorial) {
    console.log(`Descargando PDF: ${reporte.nombre} (id: ${reporte.id})`)
  }

  function handleDescargarExcel(reporte: ReporteHistorial) {
    console.log(`Descargando Excel: ${reporte.nombre} (id: ${reporte.id})`)
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
            <ReporteCard key={r.id} reporte={r} />
          ))}
          <ReporteAdHocCard />
        </div>
      </section>

      {/* Historial */}
      <section
        className="rounded-xl border bg-card p-4 md:p-6"
        aria-label="Historial de reportes"
      >
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Historial
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Generado por</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HISTORIAL.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nombre}</TableCell>
                <TableCell>
                  <TipoCell tipo={r.tipo} />
                </TableCell>
                <TableCell className="text-muted-foreground">{r.fecha}</TableCell>
                <TableCell className="text-muted-foreground">{r.generadoPor}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[2.75rem] gap-1.5 text-xs"
                      onClick={() => handleDescargarPdf(r)}
                    >
                      <FileDown className="size-3.5" />
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-[2.75rem] gap-1.5 text-xs"
                      onClick={() => handleDescargarExcel(r)}
                    >
                      <FileSpreadsheet className="size-3.5" />
                      Excel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}
