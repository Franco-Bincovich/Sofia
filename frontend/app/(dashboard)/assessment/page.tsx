"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Tabs } from "@base-ui/react/tabs"

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

type TipoCampaña   = "completo" | "conductual" | "cognitivo"
type EstadoCampaña = "activa" | "cerrada"
type TipoEval      = "completo" | "conductual" | "cognitivo"

interface Campaña {
  id: string
  nombre: string
  tipo: TipoCampaña
  fechaCreacion: string
  linksEnviados: number
  completados: number
  estado: EstadoCampaña
}

interface Resultado {
  id: string
  evaluado: string
  tipo: TipoEval
  fechaCompletado: string
  perfilDominante: string
  scoreGeneral: number
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAMPAÑAS: Campaña[] = [
  {
    id: "c1",
    nombre: "Assessment Q2 2025",
    tipo: "completo",
    fechaCreacion: "15/03/2025",
    linksEnviados: 8,
    completados: 6,
    estado: "activa",
  },
  {
    id: "c2",
    nombre: "Evaluación Equipo Ventas",
    tipo: "conductual",
    fechaCreacion: "01/04/2025",
    linksEnviados: 12,
    completados: 12,
    estado: "cerrada",
  },
  {
    id: "c3",
    nombre: "Ingeniería Senior — Batch 1",
    tipo: "cognitivo",
    fechaCreacion: "20/04/2025",
    linksEnviados: 5,
    completados: 2,
    estado: "activa",
  },
]

const RESULTADOS: Resultado[] = [
  { id: "1", evaluado: "Ana García",      tipo: "completo",   fechaCompletado: "10/04/2025", perfilDominante: "Liderazgo",        scoreGeneral: 82 },
  { id: "2", evaluado: "Carlos López",    tipo: "conductual", fechaCompletado: "15/04/2025", perfilDominante: "Apertura",         scoreGeneral: 75 },
  { id: "3", evaluado: "María Fernández", tipo: "completo",   fechaCompletado: "20/04/2025", perfilDominante: "Responsabilidad",  scoreGeneral: 68 },
  { id: "4", evaluado: "Diego Torres",    tipo: "cognitivo",  fechaCompletado: "22/04/2025", perfilDominante: "Estabilidad",      scoreGeneral: 91 },
]

// ─── Badge maps ───────────────────────────────────────────────────────────────

const ESTADO_VARIANT: Record<EstadoCampaña, "default" | "secondary"> = {
  activa:  "default",
  cerrada: "secondary",
}

const TIPO_LABEL: Record<TipoCampaña | TipoEval, string> = {
  completo:   "Completo",
  conductual: "Conductual",
  cognitivo:  "Cognitivo",
}

const TAB_CLASS =
  "rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground outline-none " +
  "transition-colors hover:text-foreground " +
  "data-active:bg-background data-active:text-foreground data-active:shadow-sm " +
  "focus-visible:ring-2 focus-visible:ring-ring/50"

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Engine"
        description="Campañas de evaluación y resultados del modelo AREAS"
        action={
          <Button className="min-h-11">
            <Plus />
            Nueva campaña
          </Button>
        }
      />

      <Tabs.Root defaultValue="campanias" className="space-y-6">
        <Tabs.List className="inline-flex gap-0.5 rounded-xl bg-muted p-1">
          <Tabs.Tab value="campanias" className={TAB_CLASS}>Campañas</Tabs.Tab>
          <Tabs.Tab value="resultados" className={TAB_CLASS}>Resultados</Tabs.Tab>
        </Tabs.List>

        {/* ── Tab 1: Campañas ───────────────────────────────────────────── */}
        <Tabs.Panel value="campanias">
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
              {CAMPAÑAS.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TIPO_LABEL[c.tipo]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.fechaCreacion}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {c.linksEnviados}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={c.completados === c.linksEnviados ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}>
                      {c.completados}
                    </span>
                    <span className="text-muted-foreground">/{c.linksEnviados}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[c.estado]} className="capitalize">
                      {c.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tabs.Panel>

        {/* ── Tab 2: Resultados ─────────────────────────────────────────── */}
        <Tabs.Panel value="resultados">
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
              {RESULTADOS.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/assessment/${r.id}`)}
                >
                  <TableCell className="font-medium">{r.evaluado}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TIPO_LABEL[r.tipo]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.fechaCompletado}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.perfilDominante}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{r.scoreGeneral}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}
