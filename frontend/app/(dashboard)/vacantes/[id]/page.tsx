"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Briefcase, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CandidatoCard } from "@/components/features/vacantes/CandidatoCard"
import { CandidatoModal } from "@/components/features/vacantes/CandidatoModal"
import { fetchVacante, fetchCandidatos, moverCandidato } from "@/services/vacantes"
import type { Candidato, EstadoVacante, EtapaPipeline, Vacante } from "@/types/vacantes"

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

function formatFecha(raw: string | null): string {
  if (!raw) return "—"
  const d = new Date(raw)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function buildCargoLabel(c: Candidato): string {
  const parts = [c.cargo_anterior, c.empresa_anterior].filter(Boolean)
  return parts.join(" · ") || "Sin datos"
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64 rounded-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-72 flex-shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function VacanteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [vacante, setVacante] = useState<Vacante | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [moviendo, setMoviendo] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [v, cs] = await Promise.all([fetchVacante(id), fetchCandidatos(id)])
      setVacante(v)
      setCandidatos(cs)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleMover(candidatoId: string, etapa: EtapaPipeline) {
    setMoviendo(candidatoId)
    try {
      const updated = await moverCandidato(candidatoId, etapa)
      setCandidatos((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )
    } catch {
      // silently ignore — the UI stays in previous state
    } finally {
      setMoviendo(null)
    }
  }

  const candidatosPorEtapa = ETAPAS.reduce<Record<EtapaPipeline, Candidato[]>>(
    (acc, etapa) => {
      acc[etapa] = candidatos.filter((c) => c.etapa_pipeline === etapa)
      return acc
    },
    { postulado: [], assessment: [], entrevista_rrhh: [], entrevista_tecnica: [], oferta: [] },
  )

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

      {loading && <PageSkeleton />}

      {!loading && error && (
        <ErrorState action={load} />
      )}

      {!loading && !error && !vacante && (
        <EmptyState
          icon={<Briefcase />}
          title="Vacante no encontrada"
          description="La vacante que buscás no existe o fue eliminada."
          action={<Button onClick={() => router.push("/vacantes")}>Ver vacantes</Button>}
        />
      )}

      {!loading && !error && vacante && (
        <>
          <PageHeader
            title={vacante.titulo}
            description={vacante.area_nombre ?? "—"}
            action={
              <Button className="min-h-11" onClick={() => setModalOpen(true)}>
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
              <span className="text-sm text-muted-foreground">
                Apertura: {formatFecha(vacante.fecha_apertura ?? vacante.created_at)}
              </span>
            </div>
            {vacante.descripcion && (
              <p className="mb-4 text-sm text-foreground">{vacante.descripcion}</p>
            )}
            {vacante.requisitos.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requisitos
                </h3>
                <ul className="list-inside list-disc space-y-1">
                  {vacante.requisitos.map((req, i) => (
                    <li key={i} className="text-sm text-foreground">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                const siguienteEtapa = ETAPAS[ETAPAS.indexOf(etapa) + 1]
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
                        <div key={c.id}>
                          <CandidatoCard
                            nombre={`${c.nombre} ${c.apellido}`}
                            cargoAnterior={buildCargoLabel(c)}
                            fechaAplicacion={formatFecha(c.created_at)}
                            etapa={c.etapa_pipeline}
                          />
                          {siguienteEtapa && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 h-7 w-full text-xs text-muted-foreground"
                              disabled={moviendo === c.id}
                              onClick={() => handleMover(c.id, siguienteEtapa)}
                            >
                              {moviendo === c.id ? "Moviendo..." : `→ ${ETAPA_LABELS[siguienteEtapa]}`}
                            </Button>
                          )}
                        </div>
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

          <CandidatoModal
            open={modalOpen}
            vacanteId={id}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false)
              load()
            }}
          />
        </>
      )}
    </div>
  )
}
