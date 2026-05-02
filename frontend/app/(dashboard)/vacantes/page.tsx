"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
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
import type { EstadoVacante, Vacante } from "@/types/vacantes"

const MOCK: Vacante[] = [
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

export default function VacantesPage() {
  const router = useRouter()
  const [estadoFilter, setEstadoFilter] = useState<EstadoVacante | "">("")

  const filtered = useMemo(() => {
    if (!estadoFilter) return MOCK
    return MOCK.filter((v) => v.estado === estadoFilter)
  }, [estadoFilter])

  return (
    <div>
      <PageHeader
        title="Vacantes"
        description={`${filtered.length} vacante${filtered.length !== 1 ? "s" : ""}`}
        action={
          <Button className="min-h-11">
            <Plus />
            Nueva vacante
          </Button>
        }
      />

      <div className="mb-4">
        <select
          aria-label="Filtrar por estado"
          className="min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value as EstadoVacante | "")}
        >
          <option value="">Todos los estados</option>
          <option value="nueva">Nueva</option>
          <option value="en_proceso">En proceso</option>
          <option value="con_candidatos">Con candidatos</option>
          <option value="cerrada">Cerrada</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="Sin resultados"
          description="No hay vacantes que coincidan con el filtro seleccionado."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de apertura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((vacante) => (
              <TableRow
                key={vacante.id}
                className="cursor-pointer"
                onClick={() => router.push(`/vacantes/${vacante.id}`)}
              >
                <TableCell className="font-medium">{vacante.titulo}</TableCell>
                <TableCell className="text-muted-foreground">{vacante.area}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANTS[vacante.estado]}>
                    {ESTADO_LABELS[vacante.estado]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{vacante.fechaApertura}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
