"use client"

import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Briefcase, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CandidatoCard } from "@/components/features/vacantes/CandidatoCard"
import type { Candidato, EstadoVacante, EtapaPipeline, Vacante } from "@/types/vacantes"

const MOCK_VACANTES: Vacante[] = [
  {
    id: "1",
    titulo: "Desarrollador Full Stack Senior",
    area: "Tecnología",
    estado: "en_proceso",
    fechaApertura: "01/03/2025",
    descripcion:
      "Buscamos un desarrollador con experiencia en React, Node.js y bases de datos relacionales para unirse al equipo de plataforma. El rol implica diseño de arquitectura, revisión de código y mentoring de desarrolladores junior.",
    requisitos: [
      "5+ años de experiencia en desarrollo web",
      "React y TypeScript (avanzado)",
      "Node.js / Express",
      "PostgreSQL y manejo de migraciones",
      "Experiencia en metodologías ágiles",
    ],
  },
  {
    id: "2",
    titulo: "Product Manager",
    area: "Producto",
    estado: "nueva",
    fechaApertura: "15/04/2025",
    descripcion:
      "Buscamos un PM con experiencia en productos digitales B2B para liderar el roadmap de nuestra plataforma principal junto al equipo de ingeniería y diseño.",
    requisitos: [
      "3+ años como Product Manager",
      "Experiencia en productos SaaS B2B",
      "Metodologías ágiles (Scrum/Kanban)",
      "Análisis de métricas y KPIs",
      "Comunicación con stakeholders C-level",
    ],
  },
  {
    id: "3",
    titulo: "Analista de Datos",
    area: "Tecnología",
    estado: "con_candidatos",
    fechaApertura: "10/02/2025",
    descripcion:
      "Posición orientada al análisis de datos del negocio, construcción de dashboards ejecutivos y generación de insights accionables para las áreas de producto y comercial.",
    requisitos: [
      "SQL avanzado (queries complejas, optimización)",
      "Python o R para análisis estadístico",
      "Tableau o Power BI",
      "Estadística descriptiva e inferencial",
    ],
  },
  {
    id: "4",
    titulo: "HR Business Partner",
    area: "RRHH",
    estado: "cerrada",
    fechaApertura: "05/01/2025",
    descripcion:
      "Rol estratégico de HRBP para acompañar a las áreas de Tecnología y Producto en sus procesos de gestión de personas, clima organizacional y desarrollo de talento.",
    requisitos: [
      "5+ años de experiencia en RRHH",
      "Experiencia en empresas de tecnología",
      "Gestión de procesos de selección end-to-end",
      "Planes de desarrollo y sucesión",
      "Gestión del cambio organizacional",
    ],
  },
]

const MOCK_CANDIDATOS: Candidato[] = [
  {
    id: "c1",
    vacanteId: "1",
    nombre: "Lucas Pereyra",
    cargoAnterior: "Tech Lead · Globant",
    fechaAplicacion: "05/03/2025",
    etapa: "postulado",
  },
  {
    id: "c2",
    vacanteId: "1",
    nombre: "Valentina Castro",
    cargoAnterior: "Frontend Dev · Mercado Libre",
    fechaAplicacion: "08/03/2025",
    etapa: "assessment",
  },
  {
    id: "c3",
    vacanteId: "1",
    nombre: "Matías Romero",
    cargoAnterior: "Full Stack · Accenture",
    fechaAplicacion: "10/03/2025",
    etapa: "entrevista_rrhh",
  },
  {
    id: "c4",
    vacanteId: "1",
    nombre: "Camila Vega",
    cargoAnterior: "Backend Dev · Ualá",
    fechaAplicacion: "12/03/2025",
    etapa: "oferta",
  },
]

const ETAPAS: EtapaPipeline[] = [
  "postulado",
  "assessment",
  "entrevista_rrhh",
  "entrevista_tecnica",
  "oferta",
]

const ETAPA_LABELS: Record<EtapaPipeline, string> = {
  postulado: "Postulado",
  assessment: "Assessment",
  entrevista_rrhh: "Entrevista RRHH",
  entrevista_tecnica: "Entrevista Técnica",
  oferta: "Oferta",
}

const ETAPA_COLUMN_BG: Record<EtapaPipeline, string> = {
  postulado: "bg-slate-50 dark:bg-slate-800/40",
  assessment: "bg-amber-50 dark:bg-amber-900/20",
  entrevista_rrhh: "bg-blue-50 dark:bg-blue-900/20",
  entrevista_tecnica: "bg-purple-50 dark:bg-purple-900/20",
  oferta: "bg-emerald-50 dark:bg-emerald-900/20",
}

const ETAPA_DOT: Record<EtapaPipeline, string> = {
  postulado: "bg-slate-400",
  assessment: "bg-amber-400",
  entrevista_rrhh: "bg-blue-500",
  entrevista_tecnica: "bg-purple-500",
  oferta: "bg-emerald-500",
}

const ESTADO_LABELS: Record<EstadoVacante, string> = {
  nueva: "Nueva",
  en_proceso: "En proceso",
  con_candidatos: "Con candidatos",
  cerrada: "Cerrada",
}

const ESTADO_VARIANTS: Record<EstadoVacante, "default" | "secondary" | "destructive" | "outline"> = {
  nueva: "outline",
  en_proceso: "default",
  con_candidatos: "secondary",
  cerrada: "destructive",
}

export default function VacanteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const vacante = MOCK_VACANTES.find((v) => v.id === id) ?? null
  const candidatos = MOCK_CANDIDATOS.filter((c) => c.vacanteId === id)

  const candidatosPorEtapa = ETAPAS.reduce<Record<EtapaPipeline, Candidato[]>>(
    (acc, etapa) => {
      acc[etapa] = candidatos.filter((c) => c.etapa === etapa)
      return acc
    },
    { postulado: [], assessment: [], entrevista_rrhh: [], entrevista_tecnica: [], oferta: [] },
  )

  if (!vacante) {
    return (
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 min-h-11 gap-2"
          onClick={() => router.push("/vacantes")}
        >
          <ArrowLeft className="size-4" />
          Volver a Vacantes
        </Button>
        <EmptyState
          icon={<Briefcase />}
          title="Vacante no encontrada"
          description="La vacante que buscás no existe o fue eliminada."
          action={<Button onClick={() => router.push("/vacantes")}>Ver vacantes</Button>}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 gap-2"
          onClick={() => router.push("/vacantes")}
        >
          <ArrowLeft className="size-4" />
          Volver a Vacantes
        </Button>
      </div>

      <PageHeader
        title={vacante.titulo}
        description={vacante.area}
        action={
          <Button className="min-h-11">
            <Plus />
            Agregar candidato
          </Button>
        }
      />

      <div className="mb-8 rounded-xl border bg-card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge variant={ESTADO_VARIANTS[vacante.estado]}>
            {ESTADO_LABELS[vacante.estado]}
          </Badge>
          <span className="text-sm text-muted-foreground">Apertura: {vacante.fechaApertura}</span>
        </div>
        <p className="mb-4 text-sm text-foreground">{vacante.descripcion}</p>
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Requisitos
          </h3>
          <ul className="list-inside list-disc space-y-1">
            {vacante.requisitos.map((req) => (
              <li key={req} className="text-sm text-foreground">
                {req}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Pipeline de selección</h2>
        <span className="text-sm text-muted-foreground">
          {candidatos.length} candidato{candidatos.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ width: "max-content" }}>
          {ETAPAS.map((etapa) => {
            const cards = candidatosPorEtapa[etapa]
            return (
              <div
                key={etapa}
                className={`flex w-72 flex-shrink-0 flex-col rounded-xl p-3 ${ETAPA_COLUMN_BG[etapa]}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${ETAPA_DOT[etapa]}`} />
                    <span className="text-sm font-semibold text-foreground">
                      {ETAPA_LABELS[etapa]}
                    </span>
                  </div>
                  <Badge variant="secondary">{cards.length}</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {cards.map((c) => (
                    <CandidatoCard
                      key={c.id}
                      nombre={c.nombre}
                      cargoAnterior={c.cargoAnterior}
                      fechaAplicacion={c.fechaAplicacion}
                      etapa={c.etapa}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground">
                      Sin candidatos
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
