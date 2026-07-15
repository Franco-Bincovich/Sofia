"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Briefcase, ExternalLink, Mail, Plus, RefreshCw, Share2 } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CandidatoCard } from "@/components/features/vacantes/CandidatoCard"
import { CandidatoModal } from "@/components/features/vacantes/CandidatoModal"
import { EliminarVacanteButton } from "@/components/features/vacantes/EliminarVacanteButton"
import { InformacionPuestoSection } from "@/components/features/vacantes/InformacionPuestoSection"
import { PublicacionSection } from "@/components/features/vacantes/PublicacionSection"
import { VacanteImagenes } from "@/components/features/vacantes/VacanteImagenes"
import { ApiError, getSession } from "@/services/api"
import { useCanWrite } from "@/hooks/useCanWrite"
import {
  crearCandidatoDesdeEmail,
  fetchCandidatos,
  fetchEmailsCandidatos,
  fetchVacante,
  moverCandidato,
  publicarLinkedin,
} from "@/services/vacantes"
import type { Candidato, EmailCandidato, EstadoVacante, EtapaPipeline, Vacante } from "@/types/vacantes"

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

// ── Modal de publicación en LinkedIn ─────────────────────────────────────────

interface LinkedinModalProps {
  open: boolean
  vacanteId: string
  defaultEmail: string
  onClose: () => void
  onSuccess: () => void
}

function LinkedinModal({ open, vacanteId, defaultEmail, onClose, onSuccess }: LinkedinModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState(defaultEmail)
  const [loading, setLoading] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail)
      setNotConfigured(false)
      setError(null)
    }
  }, [open, defaultEmail])

  const handlePublicar = async () => {
    if (!email.trim()) return
    setLoading(true)
    setNotConfigured(false)
    setError(null)
    try {
      await publicarLinkedin(vacanteId, { email_contacto: email.trim() })
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.code === "ZERNIO_NOT_CONFIGURED") {
        setNotConfigured(true)
      } else {
        setError(err instanceof Error ? err.message : "Error al publicar")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar en LinkedIn</DialogTitle>
          <DialogDescription>
            Se publicará la vacante en LinkedIn via Zernio con el email de contacto indicado.
          </DialogDescription>
        </DialogHeader>

        {notConfigured ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            Zernio no está configurado.{" "}
            <button
              className="font-medium underline underline-offset-2"
              onClick={() => router.push("/configuracion")}
            >
              Ir a Configuración
            </button>{" "}
            para agregar tu API key.
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="linkedin-email" className="mb-1.5 block text-sm">
                Email de contacto
              </Label>
              <Input
                id="linkedin-email"
                type="email"
                placeholder="rrhh@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {!notConfigured && (
            <Button onClick={handlePublicar} disabled={loading || !email.trim()}>
              {loading ? "Publicando…" : "Publicar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Sección de emails recibidos ───────────────────────────────────────────────

interface EmailsSectionProps {
  vacanteId: string
  canWrite: boolean
  onCandidatoAgregado: () => void
}

function EmailsSection({ vacanteId, canWrite, onCandidatoAgregado }: EmailsSectionProps) {
  const router = useRouter()
  const [emails, setEmails] = useState<EmailCandidato[]>([])
  const [loading, setLoading] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agregando, setAgregando] = useState<string | null>(null)

  const cargarEmails = async () => {
    setLoading(true)
    setNotConfigured(false)
    setError(null)
    try {
      const data = await fetchEmailsCandidatos(vacanteId)
      setEmails(data)
      setCargado(true)
    } catch (err) {
      if (err instanceof ApiError && err.code === "GMAIL_NOT_CONFIGURED") {
        setNotConfigured(true)
        setCargado(true)
      } else {
        setError(err instanceof Error ? err.message : "Error al cargar emails")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAgregar = async (emailId: string) => {
    setAgregando(emailId)
    try {
      await crearCandidatoDesdeEmail(vacanteId, emailId)
      onCandidatoAgregado()
      setEmails((prev) => prev.filter((e) => e.email_id !== emailId))
    } catch {
      // stay in current state
    } finally {
      setAgregando(null)
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Emails recibidos</h2>
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 gap-2"
          onClick={cargarEmails}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {cargado ? "Actualizar" : "Revisar emails"}
        </Button>
      </div>

      {!cargado && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Mail className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Hacé click en "Revisar emails" para ver postulaciones recibidas en Gmail.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {cargado && !loading && notConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Gmail no está conectado.{" "}
          <button
            className="font-medium underline underline-offset-2"
            onClick={() => router.push("/configuracion")}
          >
            Ir a Configuración
          </button>{" "}
          para conectar tu cuenta de Google.
        </div>
      )}

      {cargado && !loading && !notConfigured && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {cargado && !loading && !notConfigured && !error && emails.length === 0 && (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay emails relacionados con esta vacante.
          </p>
        </div>
      )}

      {cargado && !loading && !notConfigured && !error && emails.length > 0 && (
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.email_id}
              className="flex items-start justify-between gap-4 rounded-lg border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{email.remitente}</p>
                <p className="truncate text-sm text-muted-foreground">{email.asunto}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {email.cuerpo_preview}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{email.fecha}</p>
              </div>
              {canWrite && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 min-h-10"
                  disabled={agregando === email.email_id}
                  onClick={() => handleAgregar(email.email_id)}
                >
                  {agregando === email.email_id ? "Agregando…" : "Agregar como candidato"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function VacanteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [vacante, setVacante] = useState<Vacante | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false)
  const [moviendo, setMoviendo] = useState<string | null>(null)
  const canWrite = useCanWrite()

  const userEmail = getSession()?.user.email ?? ""

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
              <div className="flex flex-wrap items-center gap-2">
                {vacante.linkedin_post_id ? (
                  <a
                    href={vacante.linkedin_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#0A66C2] px-3 py-2 text-sm font-medium text-[#0A66C2] transition-colors hover:bg-[#0A66C2]/10"
                  >
                    <Share2 className="size-4" />
                    Publicada en LinkedIn
                    <ExternalLink className="size-3" />
                  </a>
                ) : canWrite ? (
                  <Button
                    variant="outline"
                    className="min-h-11 gap-2 border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10"
                    onClick={() => setLinkedinModalOpen(true)}
                  >
                    <Share2 className="size-4" />
                    Publicar en LinkedIn
                  </Button>
                ) : null}
                {canWrite && (
                  <Button className="min-h-11" onClick={() => setModalOpen(true)}>
                    <Plus />
                    Agregar candidato
                  </Button>
                )}
                {canWrite && <EliminarVacanteButton vacanteId={id} titulo={vacante.titulo} />}
              </div>
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
              <p className="text-sm text-foreground">{vacante.descripcion}</p>
            )}
          </div>

          <InformacionPuestoSection vacante={vacante} canWrite={canWrite} onSaved={setVacante} />

          <PublicacionSection vacante={vacante} canWrite={canWrite} onSaved={setVacante} />

          <VacanteImagenes vacanteId={id} />

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
                          {canWrite && siguienteEtapa && (
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

          <EmailsSection vacanteId={id} canWrite={canWrite} onCandidatoAgregado={load} />

          <CandidatoModal
            open={modalOpen}
            vacanteId={id}
            onClose={() => setModalOpen(false)}
            onSuccess={() => {
              setModalOpen(false)
              load()
            }}
          />

          <LinkedinModal
            open={linkedinModalOpen}
            vacanteId={id}
            defaultEmail={vacante.email_contacto ?? userEmail}
            onClose={() => setLinkedinModalOpen(false)}
            onSuccess={load}
          />
        </>
      )}
    </div>
  )
}
