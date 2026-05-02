"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Tabs } from "@base-ui/react/tabs"

import { PageHeader } from "@/components/layout/PageHeader"
import { CampanaModal } from "@/components/features/assessment/CampanaModal"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchCampanas, fetchResultados } from "@/services/assessment"
import type { Campana, Resultado } from "@/types/assessment"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  completo:   "Completo",
  conductual: "Conductual",
  cognitivo:  "Cognitivo",
}

const ESTADO_VARIANT: Record<string, "default" | "secondary"> = {
  activa:   "default",
  cerrada:  "secondary",
  borrador: "secondary",
  archivada: "secondary",
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

const TAB_CLASS =
  "rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground outline-none " +
  "transition-colors hover:text-foreground " +
  "data-active:bg-background data-active:text-foreground data-active:shadow-sm " +
  "focus-visible:ring-2 focus-visible:ring-ring/50"

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function TableSkeleton({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter()

  const [campanas, setCampanas]   = useState<Campana[]>([])
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [loadingC, setLoadingC]   = useState(true)
  const [loadingR, setLoadingR]   = useState(true)
  const [errorC, setErrorC]       = useState(false)
  const [errorR, setErrorR]       = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    fetchCampanas()
      .then(setCampanas)
      .catch(() => setErrorC(true))
      .finally(() => setLoadingC(false))
    fetchResultados()
      .then(setResultados)
      .catch(() => setErrorR(true))
      .finally(() => setLoadingR(false))
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Engine"
        description="Campañas de evaluación y resultados del modelo AREAS"
        action={
          <Button className="min-h-11" onClick={() => setModalOpen(true)}>
            <Plus />
            Nueva campaña
          </Button>
        }
      />

      <CampanaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(c) => setCampanas((prev) => [c, ...prev])}
      />

      <Tabs.Root defaultValue="campanias" className="space-y-6">
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-muted p-1">
          <Tabs.Tab value="campanias" className={TAB_CLASS}>Campañas</Tabs.Tab>
          <Tabs.Tab value="resultados" className={TAB_CLASS}>Resultados</Tabs.Tab>
        </Tabs.List>

        {/* ── Tab 1: Campañas ───────────────────────────────────────────── */}
        <Tabs.Panel value="campanias">
          {errorC ? (
            <ErrorState action={() => { setErrorC(false); setLoadingC(true); fetchCampanas().then(setCampanas).catch(() => setErrorC(true)).finally(() => setLoadingC(false)) }} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Links</TableHead>
                  <TableHead className="text-right">Completados</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingC ? (
                  <TableSkeleton cols={6} />
                ) : campanas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState icon={<Plus />} title="Sin campañas" description="Creá la primera campaña de assessment." />
                    </TableCell>
                  </TableRow>
                ) : campanas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{TIPO_LABEL[c.tipo] ?? c.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(c.created_at)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.links_enviados}</TableCell>
                    <TableCell className="text-right">
                      <span className={c.completados === c.links_enviados && c.links_enviados > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                        {c.completados}
                      </span>
                      <span className="text-muted-foreground">/{c.links_enviados}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[c.estado] ?? "secondary"} className="capitalize">
                        {c.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Tabs.Panel>

        {/* ── Tab 2: Resultados ─────────────────────────────────────────── */}
        <Tabs.Panel value="resultados">
          {errorR ? (
            <ErrorState action={() => { setErrorR(false); setLoadingR(true); fetchResultados().then(setResultados).catch(() => setErrorR(true)).finally(() => setLoadingR(false)) }} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evaluado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Perfil dominante</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingR ? (
                  <TableSkeleton cols={5} />
                ) : resultados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <EmptyState icon={<Plus />} title="Sin resultados" description="Todavía no hay evaluaciones completadas." />
                    </TableCell>
                  </TableRow>
                ) : resultados.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/assessment/${r.id}`)}
                  >
                    <TableCell className="font-medium">{r.evaluado_nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{TIPO_LABEL[r.tipo] ?? r.tipo}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.fecha_completado ? fmtDate(r.fecha_completado) : "—"}
                    </TableCell>
                    <TableCell>
                      {r.perfil_dominante ? <Badge variant="outline">{r.perfil_dominante}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {r.score_general ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
