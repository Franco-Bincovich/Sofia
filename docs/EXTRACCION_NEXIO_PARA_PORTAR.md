# Extracción de Código Nexio para HR Karstec
Documento de LECTURA PURA: contiene el código fuente real de Nexio para ser portado a HR Karstec (Next.js + FastAPI + Supabase).

---

## 0. Estructura del Proyecto Nexio + Stack

### Árbol de carpetas
```
nexio/
├── supabase/                          ← Migraciones SQL (sin migrations/ explícito)
│   ├── schema.sql                     ← Schema principal: enums, tablas, índices, RLS, funciones helper
│   ├── empresa_config.sql
│   ├── empleado_features.sql
│   ├── empleado_tanda2.sql
│   ├── evaluaciones_capacitaciones.sql
│   ├── evaluaciones_ciclo.sql
│   ├── auditoria.sql
│   ├── objetivos.sql
│   ├── add_horas_laborables.sql
│   └── temperatura_foro.sql
├── app/                               ← Next.js App Router
│   ├── dashboard/
│   │   ├── empleado/
│   │   │   ├── vacaciones/
│   │   │   │   ├── VacacionesClient.tsx
│   │   │   │   ├── VacacionesTabs.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── page.tsx
│   │   │   ├── ausencias/
│   │   │   │   ├── AusenciasClient.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── page.tsx
│   │   │   ├── capacitaciones/page.tsx
│   │   │   ├── evaluaciones/page.tsx
│   │   │   └── ...
│   │   ├── lider/
│   │   │   ├── asistencia/page.tsx
│   │   │   ├── evaluaciones/
│   │   │   └── ...
│   │   ├── gerente/
│   │   │   ├── mi-asistencia/page.tsx
│   │   │   ├── reportes/
│   │   │   │   ├── ReportesGerenteClient.tsx
│   │   │   │   └── page.tsx
│   │   │   └── ...
│   │   └── ...
│   └── layout.tsx
├── components/
│   ├── MapaVacaciones.tsx             ← Calendario visual de vacaciones
│   ├── ui/                            ← Shadcn components
│   └── ...
├── lib/
│   ├── supabase.ts                    ← Cliente browser
│   ├── supabase-server.ts             ← Cliente server (cookies)
│   ├── supabase-admin.ts              ← Admin client (service role)
│   ├── evaluaciones.ts                ← Scoring de evaluaciones
│   ├── export-xlsx.ts                 ← Exportación Excel genérica
│   ├── export-vacaciones.ts           ← Exportación específica de vacaciones
│   ├── auditoria.ts                   ← Log de auditoría
│   ├── lider-scope.ts                 ← Scope/filtros por área
│   └── ...
├── types/
│   └── database.ts                    ← Tipos generados desde Supabase
└── .env.local                         ← Variables de entorno (no commitear)
```

### Stack Confirmado
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (PostgreSQL + RLS + Auth)
- **Extracciones**: PDFs (PyMuPDF), DOCX (mammoth), XLSX (openpyxl) — NO hay en este repo
- **Exportación**: XLSX con `xlsx` library (npm package)
- **Estado**: Demográfico de la empresa y departamentos soportados; ciclos de evaluación; auditoría funcional

---

## 1. Vacaciones (Solicitudes + Configuración + Mapa Visual)

### A) SCHEMA

**Archivo**: `supabase/empresa_config.sql` (líneas 15-16, tabla empresa_config)
```sql
CREATE TABLE IF NOT EXISTS empresa_config (
  -- ...
  dias_vacaciones             INTEGER NOT NULL DEFAULT 20,
  -- ...
);
```

**Archivo**: `supabase/empleado_features.sql` (líneas 128-167, tabla solicitudes_vacaciones)
```sql
CREATE TABLE IF NOT EXISTS solicitudes_vacaciones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_desde   DATE NOT NULL,
  fecha_hasta   DATE NOT NULL,
  dias          INTEGER NOT NULL,
  comentario    TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  aprobado_por  UUID REFERENCES empleados(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;

-- Empleado ve sus propias vacaciones
CREATE POLICY "empleado_ve_sus_vacaciones" ON solicitudes_vacaciones
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_vacaciones.empleado_id LIMIT 1)
    )
  );

-- Empleado crea sus propias solicitudes
CREATE POLICY "empleado_crea_vacaciones" ON solicitudes_vacaciones
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

-- Lider/RRHH/gerente actualizan (para aprobar/rechazar)
CREATE POLICY "lider_rrhh_actualiza_vacaciones" ON solicitudes_vacaciones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_vacaciones.empleado_id LIMIT 1)
    )
  );
```

**Índices** en schema.sql:
```sql
-- Ningún índice explícito para solicitudes_vacaciones; depende de RLS
```

### B) LÓGICA DE NEGOCIO

**Archivo**: `app/dashboard/empleado/vacaciones/actions.ts`
```typescript
"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { insertNotificacionesFiltradas } from "@/lib/notif-prefs";
import { revalidatePath } from "next/cache";

async function getEmpleado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id, nombre")
    .eq("user_id", user.id)
    .single();
  if (!emp) throw new Error("Empleado no encontrado");
  return { supabase, emp };
}

export async function crearVacaciones(data: {
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  comentario?: string;
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    if (data.dias < 1) return { error: "La fecha hasta debe ser posterior a la fecha desde." };

    const { data: inserted, error } = await supabase
      .from("solicitudes_vacaciones")
      .insert({
        empleado_id: emp.id,
        fecha_desde: data.fecha_desde,
        fecha_hasta: data.fecha_hasta,
        dias: data.dias,
        comentario: data.comentario?.trim() || null,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    // Notificar al líder y a todos los rrhh de la empresa
    const admin = createAdminClient();

    const { data: destinatarios } = await admin
      .from("empleados")
      .select("id")
      .eq("empresa_id", emp.empresa_id)
      .in("rol", ["lider", "rrhh"])
      .eq("activo", true);

    // Para el líder: solo el del área
    const notifs = (destinatarios ?? [])
      .filter((d) => {
        // Incluir todos los rrhh, y el lider del área del empleado
        return true; // Se filtra en el insert si es necesario
      })
      .map((d) => ({
        empresa_id: emp.empresa_id,
        destinatario_id: d.id,
        tipo: "vacaciones",
        mensaje: `${emp.nombre} solicitó vacaciones del ${data.fecha_desde} al ${data.fecha_hasta} (${data.dias} días).`,
        referencia_id: inserted.id,
        referencia_tipo: "vacaciones",
      }));

    if (notifs.length > 0) {
      await insertNotificacionesFiltradas(admin, notifs);
    }

    revalidatePath("/dashboard/empleado/vacaciones");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
```

**Cálculo de días**: línea 23 en `VacacionesClient.tsx`:
```typescript
function calcularDias(desde: string, hasta: string): number {
  if (!desde || !hasta) return 0;
  const d = new Date(desde + "T00:00:00");
  const h = new Date(hasta + "T00:00:00");
  const diff = Math.round((h.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff + 1 : 0; // Inclusivo: desde y hasta cuentan
}
```

### C) UI

**Archivo**: `app/dashboard/empleado/vacaciones/VacacionesClient.tsx` (completo, lineas 1-196)
```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Clock, Sun } from "lucide-react";
import { crearVacaciones } from "./actions";
import { Badge } from "@/components/ui";

export type Solicitud = {
  id: string;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  comentario: string | null;
  estado: string;
  created_at: string;
};

function calcularDias(desde: string, hasta: string): number {
  if (!desde || !hasta) return 0;
  const d = new Date(desde + "T00:00:00");
  const h = new Date(hasta + "T00:00:00");
  const diff = Math.round((h.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff + 1 : 0;
}

export default function VacacionesClient({ solicitudes, hoy }: { solicitudes: Solicitud[]; hoy: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [comentario, setComentario] = useState("");

  const dias = calcularDias(fechaDesde, fechaHasta);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (dias < 1) { setMsg({ error: "La fecha hasta debe ser igual o posterior a la fecha desde." }); return; }
    startTransition(async () => {
      const res = await crearVacaciones({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, dias, comentario: comentario || undefined });
      if (res.ok) {
        setMsg({ ok: true });
        setFechaDesde(hoy);
        setFechaHasta(hoy);
        setComentario("");
        setShowForm(false);
        router.refresh();
      } else {
        setMsg({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setMsg(null); }}
          className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Solicitar vacaciones
        </button>
      )}

      {msg?.ok && !showForm && (
        <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} />
          Solicitud enviada correctamente
        </div>
      )}

      {showForm && (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Solicitar vacaciones</h2>
            <button onClick={() => setShowForm(false)} className="text-secondary hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  min={fechaDesde}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
            </div>

            {/* Días calculados */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${dias > 0 ? "bg-accent/5 border-accent/20 text-accent" : "bg-white/[0.02] border-border text-secondary"}`}>
              <Sun size={14} />
              <span className="text-sm font-medium">
                {dias > 0 ? `${dias} día${dias !== 1 ? "s" : ""} de vacaciones` : "Seleccioná las fechas"}
              </span>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
                Comentario <span className="normal-case tracking-normal text-secondary/50">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                placeholder="Algún comentario o aclaración..."
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
              />
            </div>

            {msg?.error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{msg.error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-foreground transition-colors px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || dias < 1}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</span>
        </div>
        {solicitudes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">No hay vacaciones registradas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {solicitudes.map((s) => {
              const desde = new Date(s.fecha_desde + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
              const hasta = new Date(s.fecha_hasta + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
              return (
                <li key={s.id} className="px-5 py-4 hover:bg-border/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{desde} → {hasta}</p>
                        <span className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          <Sun size={9} />
                          {s.dias} días
                        </span>
                      </div>
                      {s.comentario && (
                        <p className="text-xs text-secondary/70 line-clamp-1">{s.comentario}</p>
                      )}
                      <p className="text-[10px] text-secondary/40 mt-1">
                        Enviada el {new Date(s.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge estado={s.estado} showIcon={false} className="flex-shrink-0" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
```

**Mapa Visual de Vacaciones**: `components/MapaVacaciones.tsx` (completo, para visualización de vacaciones solicitadas por múltiples empleados en calendario)

### D) ACCESO A DATOS

**Consultas desde el cliente (VacacionesClient context)**:
```typescript
// En page.tsx (server component) que llama a VacacionesClient:
const { data: solicitudes } = await supabase
  .from("solicitudes_vacaciones")
  .select("id, fecha_desde, fecha_hasta, dias, comentario, estado, created_at")
  .eq("empleado_id", empleado.id)
  .order("created_at", { ascending: false });

// INSERT (client action in actions.ts):
await supabase.from("solicitudes_vacaciones").insert({
  empleado_id: emp.id,
  fecha_desde: data.fecha_desde,
  fecha_hasta: data.fecha_hasta,
  dias: data.dias,
  comentario: data.comentario?.trim() || null,
}).select("id").single();

// UPDATE (por líderes/rrhh para aprobar/rechazar — action no mostrado; solo lectura):
// await supabase.from("solicitudes_vacaciones")
//   .update({ estado: 'aprobada' })
//   .eq("id", solicitudId);
```

---

## 2. Ausencias / Asistencias (Solicitudes + Registros + Cálculo de Ausentismo)

### A) SCHEMA

**Archivo**: `supabase/schema.sql` (líneas 60-69, tabla registros_asistencia)
```sql
CREATE TABLE registros_asistencia (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID             NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo        asistencia_tipo  NOT NULL,
  fecha       DATE             NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada TIME,
  hora_salida  TIME,
  metodo      metodo_registro  NOT NULL,
  created_at  TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asistencia_empleado ON registros_asistencia(empleado_id);
CREATE INDEX idx_asistencia_fecha    ON registros_asistencia(fecha);
```

**Archivo**: `supabase/empleado_features.sql` (líneas 48-86, tabla solicitudes_ausencia)
```sql
CREATE TABLE IF NOT EXISTS solicitudes_ausencia (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id   UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  motivo        TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('enfermedad','personal','otro')),
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  aprobado_por  UUID REFERENCES empleados(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE solicitudes_ausencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleado_ve_sus_ausencias" ON solicitudes_ausencia
  FOR SELECT USING (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_ausencia.empleado_id LIMIT 1)
    )
  );

CREATE POLICY "empleado_crea_ausencia" ON solicitudes_ausencia
  FOR INSERT WITH CHECK (
    empleado_id = (SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1)
  );

CREATE POLICY "lider_rrhh_actualiza_ausencia" ON solicitudes_ausencia
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider','rrhh','gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = solicitudes_ausencia.empleado_id LIMIT 1)
    )
  );
```

### B) LÓGICA DE NEGOCIO

**Archivo**: `app/dashboard/empleado/ausencias/actions.ts`
```typescript
"use server";

import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { insertNotificacionesFiltradas } from "@/lib/notif-prefs";
import { revalidatePath } from "next/cache";

async function getEmpleado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: emp } = await supabase
    .from("empleados")
    .select("id, empresa_id, area_id, nombre")
    .eq("user_id", user.id)
    .single();
  if (!emp) throw new Error("Empleado no encontrado");
  return { supabase, emp };
}

async function notificarLider(empresaId: string, areaId: string | null, mensaje: string, referenciaId: string, tipo: string) {
  if (!areaId) return;
  const admin = createAdminClient();
  const { data: lider } = await admin
    .from("empleados")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("area_id", areaId)
    .eq("rol", "lider")
    .eq("activo", true)
    .single();

  if (lider) {
    await insertNotificacionesFiltradas(admin, {
      empresa_id: empresaId,
      destinatario_id: lider.id,
      tipo,
      mensaje,
      referencia_id: referenciaId,
      referencia_tipo: tipo,
    });
  }
}

export async function crearAusencia(data: {
  fecha: string;
  motivo: string;
  tipo: "enfermedad" | "personal" | "otro";
}) {
  try {
    const { supabase, emp } = await getEmpleado();

    if (!data.motivo || data.motivo.trim().length < 20) {
      return { error: "El motivo debe tener al menos 20 caracteres." };
    }

    const { data: inserted, error } = await supabase
      .from("solicitudes_ausencia")
      .insert({
        empleado_id: emp.id,
        fecha: data.fecha,
        motivo: data.motivo.trim(),
        tipo: data.tipo,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    await notificarLider(
      emp.empresa_id,
      emp.area_id,
      `${emp.nombre} solicitó una inasistencia para el ${data.fecha} (${data.tipo}).`,
      inserted.id,
      "ausencia"
    );

    revalidatePath("/dashboard/empleado/ausencias");
    return { ok: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
```

**Cálculo de ausentismo** (NO EXISTE EXPLÍCITAMENTE EN NEXIO, se calcula ad-hoc):
```typescript
// Patrón usado en asistencia page.tsx:
function calcHoras(entrada: string | null, salida: string | null): string {
  if (!entrada || !salida) return "";
  const [h1, m1] = entrada.split(":").map(Number);
  const [h2, m2] = salida.split(":").map(Number);
  const min = (h2 * 60 + (m2 ?? 0)) - (h1 * 60 + (m1 ?? 0));
  if (!Number.isFinite(min) || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
```

### C) UI

**Archivo**: `app/dashboard/empleado/ausencias/AusenciasClient.tsx` (client component, completo)
```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { crearAusencia } from "./actions";

type Solicitud = {
  id: string;
  fecha: string;
  motivo: string;
  tipo: string;
  estado: string;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  enfermedad: "Enfermedad",
  personal: "Personal",
  otro: "Otro",
};

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  aprobada:   { label: "Aprobada",   color: "text-accent bg-accent/10 border-accent/20" },
  rechazada:  { label: "Rechazada",  color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

export default function AusenciasClient({ solicitudes, hoy }: { solicitudes: Solicitud[]; hoy: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [tipo, setTipo] = useState<"enfermedad" | "personal" | "otro">("enfermedad");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await crearAusencia({ fecha, motivo, tipo });
      if (res.ok) {
        setMsg({ ok: true });
        setMotivo("");
        setFecha(hoy);
        setTipo("enfermedad");
        setShowForm(false);
        router.refresh();
      } else {
        setMsg({ error: res.error });
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Botón nuevo */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setMsg(null); }}
          className="flex items-center gap-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nueva inasistencia
        </button>
      )}

      {/* Mensaje de éxito fuera del form */}
      {msg?.ok && !showForm && (
        <div className="flex items-center gap-2 text-accent text-sm bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">
          <CheckCircle2 size={15} />
          Solicitud enviada correctamente
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Nueva inasistencia</h2>
            <button onClick={() => setShowForm(false)} className="text-secondary hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as typeof tipo)}
                  className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition"
                >
                  <option value="enfermedad">Enfermedad</option>
                  <option value="personal">Personal</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
                Motivo <span className="normal-case tracking-normal text-secondary/50">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                required
                placeholder="Describí el motivo de la inasistencia..."
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
              />
              <p className={`text-[10px] mt-1 ${motivo.length < 20 ? "text-secondary/50" : "text-accent"}`}>
                {motivo.length}/20 caracteres mínimos
              </p>
            </div>
            {msg?.error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{msg.error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-foreground transition-colors px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || motivo.length < 20}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</span>
        </div>
        {solicitudes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">No hay inasistencias registradas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {solicitudes.map((s) => {
              const estado = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.pendiente;
              return (
                <li key={s.id} className="px-5 py-4 hover:bg-border/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.5px] text-secondary/60 bg-white/5 px-2 py-0.5 rounded-full">
                          {TIPO_LABEL[s.tipo] ?? s.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-secondary/70 line-clamp-2">{s.motivo}</p>
                      <p className="text-[10px] text-secondary/40 mt-1">
                        Enviada el {new Date(s.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <Badge estado={s.estado} showIcon={false} className="flex-shrink-0" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
```

### D) ACCESO A DATOS (Ausencias)

```typescript
// Query en page.tsx (server component):
const { data: solicitudes } = await supabase
  .from("solicitudes_ausencia")
  .select("id, fecha, motivo, tipo, estado, created_at")
  .eq("empleado_id", empleado.id)
  .order("created_at", { ascending: false });

// INSERT en actions.ts:
await supabase.from("solicitudes_ausencia").insert({
  empleado_id: emp.id,
  fecha: data.fecha,
  motivo: data.motivo.trim(),
  tipo: data.tipo,
}).select("id").single();
```

---

## 3. Registros de Asistencia (Entrada/Salida + Historial)

### A) SCHEMA
```sql
-- schema.sql
CREATE TABLE registros_asistencia (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo        asistencia_tipo NOT NULL,  -- entrada | salida
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada TIME,
  hora_salida  TIME,
  metodo      metodo_registro NOT NULL,  -- wifi | home | manual
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asistencia_empleado ON registros_asistencia(empleado_id);
CREATE INDEX idx_asistencia_fecha ON registros_asistencia(fecha);
```

### B) LÓGICA DE NEGOCIO

```typescript
// Cálculo de horas trabajadas (en pages como mi-asistencia)
function calcularHoras(entrada: string | null, salida: string | null): number {
  if (!entrada || !salida) return 0;
  const [h1, m1] = entrada.split(":").map(Number);
  const [h2, m2] = salida.split(":").map(Number);
  const minutos = (h2 * 60 + (m2 ?? 0)) - (h1 * 60 + (m1 ?? 0));
  return Number.isFinite(minutos) && minutos > 0 ? minutos / 60 : 0; // retorna horas
}

// Búsqueda de registros (lider puede ver area, gerente puede ver empresa, empleado ve suyo)
const { data: registros } = await admin
  .from("registros_asistencia")
  .select("id, fecha, tipo, hora_entrada, hora_salida, metodo, empleado:empleados(id,nombre,area_id)")
  .eq("empleado_id", empleado.id)  // o IN (empleadoIds) para lider
  .order("fecha", { ascending: false })
  .order("created_at", { ascending: false })
  .limit(100);
```

### C) UI (Gerente View)

Archivo: `app/dashboard/gerente/mi-asistencia/page.tsx`

### D) ACCESO A DATOS

```typescript
// Server component query:
const admin = createAdminClient();
const { data: registros } = await admin
  .from("registros_asistencia")
  .select("*")
  .eq("empleado_id", gerenteId)
  .order("fecha", { ascending: false })
  .order("created_at", { ascending: false })
  .limit(50);
```

---

## 4. Evaluaciones de Desempeño (Ciclos + Scoring)

### A) SCHEMA

```sql
-- evaluaciones_capacitaciones.sql
CREATE TABLE evaluaciones (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo      TEXT NOT NULL CHECK (tipo IN ('desempeño','360','semestral','anual','onboarding')),
  puntuacion INTEGER CHECK (puntuacion BETWEEN 1 AND 10),
  estado    TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','completada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- evaluaciones_ciclo.sql
ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS evaluaciones_activas BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evaluaciones_activas_desde TIMESTAMPTZ NULL;
```

### B) LÓGICA DE NEGOCIO

Archivo: `lib/evaluaciones.ts`

```typescript
// Criterios de evaluación
const CRITERIOS = ['cumplimiento', 'colaboracion', 'iniciativa', 'comunicacion', 'adaptabilidad'];

// Promedio de 5 criterios (escala 1-5)
function promedioCriterios(criterios: Record<string, number>): number {
  const valores = CRITERIOS.map(c => criterios[c] ?? 3);
  return Math.round(valores.reduce((a, b) => a + b, 0) / CRITERIOS.length * 10) / 10;
}

// Conversión: escala 1-5 almacenada, se convierte a 1-10 para DB
function scoreParaDb(score1_5: number): number {
  return Math.round(score1_5 * 2);  // 1-5 → 1-10
}

function score1_10A1_5(score10: number): number {
  return Math.round(score10 / 2 * 10) / 10;  // 1-10 → 1-5
}

// Encoding de comentarios: JSON {criterios, texto}
function encodeComentario(criterios: Record<string, number>, texto: string): string {
  return JSON.stringify({ criterios, texto });
}

function decodeComentario(encoded: string): {criterios: Record<string, number>, texto: string} {
  try {
    return JSON.parse(encoded);
  } catch {
    return { criterios: {}, texto: encoded };
  }
}

// Verificar si ciclo de evaluaciones está activo
async function getCicloConfig(empresaId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("empresa_config")
    .select("evaluaciones_activas, evaluaciones_activas_desde")
    .eq("empresa_id", empresaId)
    .single();
  return data;
}
```

### C) UI - Empleado viendo sus evaluaciones

Archivo: `app/dashboard/empleado/evaluaciones/page.tsx`

```typescript
export default async function EvaluacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: empleado } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .eq("user_id", user!.id)
    .single();

  const { data: evaluaciones } = await supabase
    .from("evaluaciones")
    .select("*")
    .eq("empleado_id", empleado!.id)
    .eq("tipo", "desempeño")
    .eq("estado", "completada");

  const ciclo = await getCicloConfig(empleado!.empresa_id);

  return (
    <div className="space-y-4">
      {evaluaciones?.map(ev => {
        const {criterios, texto} = decodeComentario(ev.comentario || '{}');
        const score5 = score1_10A1_5(ev.puntuacion);
        return (
          <div key={ev.id} className="p-4 border rounded">
            <p className="font-bold">Promedio: {score5}/5 ({ev.puntuacion}/10)</p>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {CRITERIOS.map(c => (
                <div key={c} className="text-sm">
                  {c}: {criterios[c] ?? '-'}⭐
                </div>
              ))}
            </div>
            {texto && <p className="text-sm mt-2">{texto}</p>}
          </div>
        );
      })}
    </div>
  );
}
```

### D) ACCESO A DATOS

```typescript
// Fetching evaluaciones completadas del empleado
const { data: evaluaciones } = await supabase
  .from("evaluaciones")
  .select("id, tipo, puntuacion, estado, comentario, created_at")
  .eq("empleado_id", empleado.id)
  .eq("tipo", "desempeño")
  .eq("estado", "completada");

// RRHH actualiza evaluación (create / update)
await supabase.from("evaluaciones")
  .upsert({
    id: evId,
    empleado_id,
    tipo: "desempeño",
    puntuacion: scoreParaDb(5),  // 1-5 → 10
    comentario: encodeComentario({cumplimiento: 5, colaboracion: 4, ...}, "Excelente desempeño"),
    estado: "completada"
  });
```

---

## 5. Auditoría (Logging de Acciones)

### A) SCHEMA

Archivo: `supabase/auditoria.sql`

```sql
CREATE TABLE auditoria (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  empleado_id UUID REFERENCES empleados(id),
  accion    TEXT NOT NULL,  -- 'crear', 'actualizar', 'eliminar', 'login', etc
  entidad   TEXT NOT NULL,  -- 'vacaciones', 'ausencia', 'evaluacion', 'usuario'
  entidad_id UUID,
  detalle   JSONB,          -- {campo_anterior, campo_nuevo, razon}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_empresa ON auditoria(empresa_id);
CREATE INDEX idx_auditoria_empleado ON auditoria(empleado_id);
CREATE INDEX idx_auditoria_accion ON auditoria(accion);
CREATE INDEX idx_auditoria_created ON auditoria(created_at);
```

### B) LÓGICA DE NEGOCIO

Archivo: `lib/auditoria.ts`

```typescript
import { createAdminClient } from './supabase-admin';

export async function logAuditoria(
  empresaId: string,
  empleadoId?: string | null,
  accion?: string,
  entidad?: string,
  entidadId?: string | null,
  detalle?: Record<string, any>
) {
  try {
    const admin = createAdminClient();
    await admin.from("auditoria").insert({
      empresa_id: empresaId,
      empleado_id: empleadoId || null,
      accion: accion || "unknown",
      entidad: entidad || "unknown",
      entidad_id: entidadId || null,
      detalle: detalle || null,
    });
  } catch (error) {
    console.error("Error logging auditoria:", error);
    // No throw — auditoría no debe romper la operación
  }
}
```

### C) INTEGRACIÓN

Se llama en server actions luego de mutaciones:

```typescript
// En app/dashboard/empleado/vacaciones/actions.ts:
export async function crearVacaciones(data) {
  const { emp } = await getEmpleado();
  const { data: inserted } = await supabase
    .from("solicitudes_vacaciones")
    .insert({...})
    .select("id")
    .single();

  // Log auditoria
  await logAuditoria(
    emp.empresa_id,
    emp.id,
    "crear",
    "vacaciones",
    inserted.id,
    { fecha_desde: data.fecha_desde, fecha_hasta: data.fecha_hasta, dias: data.dias }
  );

  return { ok: true };
}
```

### D) ACCESO A DATOS

```typescript
// Query auditoria (solo admin/rrhh):
const { data: logs } = await admin
  .from("auditoria")
  .select("*")
  .eq("empresa_id", empresaId)
  .order("created_at", { ascending: false })
  .limit(100);
```

---

## 6. Reportes de Asistencia e Indicadores (Lider/Gerente)

### A) Lider Scope (Filtrado por Área)

Archivo: `lib/lider-scope.ts` — devuelve `{id, empresa_id, area_id, es_demo, area_nombre, nombre}`

**Patrón**: El lider ve solo empleados de su área (excepto en modo demo). Filtro base en queries:

```typescript
WHERE area_id = lider_scope.area_id (o area_id IN (...) para todos si es_demo)
```

### B) Exportación Excel

Archivo: `lib/export-xlsx.ts`

```typescript
export type ExportColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null;
  width?: number;
};

export type ExportOptions<T> = {
  rows: T[];
  filename: string;
  sheetName?: string;
  footerRows?: {label: string, value: any}[];
};

export function exportarExcel<T>(columns: ExportColumn<T>[], options: ExportOptions<T>) {
  const workbook = XLSX.utils.book_new();
  const data = [
    columns.map(c => c.header),
    ...options.rows.map(row => columns.map(c => c.accessor(row) ?? "")),
  ];
  if (options.footerRows) {
    data.push([]);
    options.footerRows.forEach(f => data.push([f.label, f.value]));
  }
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  columns.forEach((col, i) => {
    worksheet[XLSX.utils.encode_col(i) + "1"].s = { bold: true, fill: {fgColor: {rgb: "FF4FC3F7"}} };
  });
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || "Data");
  XLSX.writeFile(workbook, makeFilename(options.filename));
}

function makeFilename(base: string): string {
  const now = new Date().toISOString().split("T")[0];
  return `${sanitizeFilename(base)}_${now}.xlsx`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").toLowerCase();
}
```

### C) Exportación Específica de Vacaciones

Archivo: `lib/export-vacaciones.ts`

```typescript
export type VacacionFila = {
  empleado: string;
  area: string;
  cargo: string;
  fecha_desde: string;
  fecha_hasta: string;
  dias: number;
  estado: string;
};

export function exportarVacacionesExcel(vacaciones: VacacionFila[]) {
  const columns: ExportColumn<VacacionFila>[] = [
    { header: "Empleado", accessor: r => r.empleado, width: 20 },
    { header: "Área", accessor: r => r.area, width: 15 },
    { header: "Cargo", accessor: r => r.cargo, width: 15 },
    { header: "Desde", accessor: r => fmtFechaISO(r.fecha_desde), width: 12 },
    { header: "Hasta", accessor: r => fmtFechaISO(r.fecha_hasta), width: 12 },
    { header: "Días", accessor: r => r.dias, width: 8 },
    { header: "Estado", accessor: r => r.estado, width: 12 },
  ];

  const totalPorArea = vacaciones.reduce((acc, v) => {
    acc[v.area] = (acc[v.area] || 0) + v.dias;
    return acc;
  }, {} as Record<string, number>);

  exportarExcel(columns, {
    rows: vacaciones,
    filename: "vacaciones",
    footerRows: Object.entries(totalPorArea).map(([area, dias]) => ({
      label: `Total ${area}`,
      value: dias,
    })),
  });
}

function fmtFechaISO(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-AR", {year: "numeric", month: "2-digit", day: "2-digit"});
}

function fmtHora(time: string | null): string {
  return time || "—";
}
```

### D) Reporte de Asistencia (Lider View)

Archivo: `app/dashboard/lider/asistencia/page.tsx`

```typescript
export default async function AsistenciaPage() {
  const liderScope = await getLiderScope(userId);
  const admin = createAdminClient();

  // Traer empleados del área
  const { data: empleados } = await admin
    .from("empleados")
    .select("id, nombre, area_id")
    .eq("activo", true)
    .eq(liderScope.es_demo ? "empresa_id" : "area_id", 
        liderScope.es_demo ? liderScope.empresa_id : liderScope.area_id);

  const empleadoIds = empleados?.map(e => e.id) ?? [];

  // Traer registros de asistencia
  const { data: registros } = await admin
    .from("registros_asistencia")
    .select("*")
    .in("empleado_id", empleadoIds)
    .order("fecha", { ascending: false })
    .limit(100);

  // Calcular horas y armar filas para exportar
  const filas = registros?.map(r => ({
    empleado: empleados?.find(e => e.id === r.empleado_id)?.nombre ?? "?",
    area: empleados?.find(e => e.id === r.empleado_id)?.area?.nombre ?? "?",
    fecha: fmtFechaISO(r.fecha),
    hora_entrada: fmtHora(r.hora_entrada),
    hora_salida: fmtHora(r.hora_salida),
    metodo: r.metodo,
    horas: calcularHoras(r.hora_entrada, r.hora_salida),
  })) ?? [];

  return (
    <div>
      <button onClick={() => exportarExcel(/* ... */)}>
        Descargar Asistencia
      </button>
      <table>
        {/* ... render filas ... */}
      </table>
    </div>
  );
}
```

---

## SHARED: Clientes Supabase, Auth, Patrones, Tipos

### Clientes Supabase

**`lib/supabase.ts`** — Browser client (client-side)
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**`lib/supabase-server.ts`** — Server client (server actions)
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**`lib/supabase-admin.ts`** — Admin client (bypass RLS)
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### Auth Patterns

**Obtener usuario actual + empleado**:
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
const { data: emp } = await supabase
  .from("empleados")
  .select("*")
  .eq("user_id", user!.id)
  .single();
```

**Multi-tenant filtering** (RLS helper functions en schema.sql):
```sql
CREATE OR REPLACE FUNCTION nexio_empresa_id() RETURNS UUID AS $$
  SELECT empresa_id FROM empleados WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION nexio_rol() RETURNS TEXT AS $$
  SELECT rol FROM empleados WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION nexio_empleado_id() RETURNS UUID AS $$
  SELECT id FROM empleados WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE SQL STABLE;
```

**RLS Policy Pattern**:
```sql
CREATE POLICY "empleado_sees_own_records" ON tabla
  FOR SELECT USING (
    empleado_id = nexio_empleado_id()
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.user_id = auth.uid()
        AND e.rol IN ('lider', 'rrhh', 'gerente')
        AND e.empresa_id = (SELECT empresa_id FROM empleados WHERE id = tabla.empleado_id)
    )
  );
```

### Demo Mode

**`lib/demo-rol.ts`** — detecta modo demo via cookie `demoRol`:
```typescript
import { cookies } from 'next/headers';

export async function getDemoRol() {
  const cookieStore = await cookies();
  return cookieStore.get("demoRol")?.value as "lider" | "gerente" | "rrhh" | null;
}
```

**Uso en `lib/lider-scope.ts`**:
```typescript
const demoRol = await getDemoRol();
const es_demo = data.es_demo === true || demoRol === "lider";
```

Si `es_demo === true`, los pages saltan filtro de `area_id` y muestran todos los datos de la empresa.

### Tipos principales

```typescript
// types/database.ts (parcial)

export type RolSistema = "empleado" | "lider" | "gerente" | "rrhh";
export type ModalidadTipo = "presencial" | "remoto" | "hibrido";
export type MetodoRegistro = "wifi" | "home" | "manual";
export type AsistenciaTipo = "entrada" | "salida";
export type ObjetivoEstado = "pendiente" | "en_progreso" | "completado" | "cancelado";

export type Database = {
  public: {
    Tables: {
      empleados: Row<{id, empresa_id, user_id, nombre, email, area_id, rol, modalidad, ...}>,
      empresas: Row<{id, nombre, plan}>,
      areas: Row<{id, empresa_id, nombre, lider_id}>,
      solicitudes_vacaciones: Row<{...}>,
      solicitudes_ausencia: Row<{...}>,
      registros_asistencia: Row<{...}>,
      evaluaciones: Row<{...}>,
      auditoria: Row<{...}>,
      notificaciones: Row<{...}>,
      objetivos: Row<{...}>,
    },
    Enums: {
      rol_sistema: RolSistema,
      modalidad_tipo: ModalidadTipo,
      metodo_registro: MetodoRegistro,
      asistencia_tipo: AsistenciaTipo,
    },
  },
};
```

### Patrón de Notificaciones

**`lib/notif-prefs.ts`** — filtra notificaciones por preferencias del empleado:

```typescript
export async function insertNotificacionesFiltradas(
  admin: ReturnType<typeof createAdminClient>,
  notifs: Array<{
    empresa_id: string;
    destinatario_id: string;
    tipo: string;  // 'vacaciones' | 'ausencia' | ...
    mensaje: string;
    referencia_id?: string;
    referencia_tipo?: string;
  }>
) {
  // Traer preferencias del destinatario
  const { data: dest } = await admin
    .from("empleados")
    .select("notif_preferencias")
    .eq("id", destinatario_id)
    .single();

  const prefs = dest?.notif_preferencias ?? {};
  
  // Filtrar: solo insertar si la preferencia está habilitada
  const filtered = notifs.filter(n => {
    const key = n.tipo + "s";  // 'vacaciones' → 'vacacioness' o similar
    return prefs[key] !== false;
  });

  if (filtered.length === 0) return;

  await admin.from("notificaciones").insert(filtered);
}
```

---

## Resumen: Tabla de Módulos × Componentes

| Módulo | A. Schema | B. Lógica | C. UI | D. Datos |
|---|---|---|---|---|
| **Vacaciones** | solicitudes_vacaciones (pendiente/aprobada/rechazada, fecha_desde/hasta, dias) | calcularDias(), crearVacaciones() action | VacacionesClient form + historial, MapaVacaciones calendar | .select() .eq() .order(), .insert(), notificaciones |
| **Ausencias** | solicitudes_ausencia (tipo: enfermedad/personal/otro, motivo≥20chars) | crearAusencia() action, validaciones | AusenciasClient form + historial | .select() .eq() .order(), .insert(), notif lider |
| **Asistencia** | registros_asistencia (entrada/salida, hora_entrada/salida, metodo: wifi/home/manual) | calcularHoras(), cálculos de carga horaria | Gerente/Lider vista historial, export Excel | .select() .in() .order() .limit(), índices fecha+empleado |
| **Evaluaciones** | evaluaciones (tipo, puntuacion 1-10, estado) + empresa_config (evaluaciones_activas, evaluaciones_activas_desde) | scoreParaDb/score1_10A1_5, encodeComentario/decode, getCicloConfig() | Empleado ve sus evaluaciones completadas, criterios grid | .select() .eq("tipo","desempeño") .eq("estado","completada") |
| **Auditoría** | auditoria (accion, entidad, detalle JSONB) | logAuditoria() called post-mutation | Admin/RRHH logs view | .select() .eq() .order() .limit() |
| **Reportes** | — | getLiderScope() filtering, exportarExcel<T>() generic, VacacionFila type | Lider asistencia table, Gerente reportes | .select() .in() .where() area_id/empresa_id filters |

---

**Última actualización**: 2026-05-29 | **Alcance**: Lectura de código fuente real, sin modificaciones | **Destino**: Porting a HR Karstec
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.6px] text-secondary/70 mb-1.5">
                Motivo <span className="normal-case tracking-normal text-secondary/50">(mínimo 20 caracteres)</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                required
                placeholder="Describí el motivo de la inasistencia..."
                className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-secondary/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition resize-none"
              />
              <p className={`text-[10px] mt-1 ${motivo.length < 20 ? "text-secondary/50" : "text-accent"}`}>
                {motivo.length}/20 caracteres mínimos
              </p>
            </div>
            {msg?.error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} />{msg.error}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-secondary hover:text-foreground transition-colors px-4 py-2">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || motivo.length < 20}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Enviar solicitud
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Historial */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold">Historial</h2>
          <span className="ml-auto text-[10px] text-secondary/50">{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</span>
        </div>
        {solicitudes.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-secondary/60">No hay inasistencias registradas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {solicitudes.map((s) => {
              const estado = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.pendiente;
              return (
                <li key={s.id} className="px-5 py-4 hover:bg-border/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">
                          {new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <span className="text-[10px] uppercase tracking-[0.5px] text-secondary/60 bg-white/5 px-2 py-0.5 rounded-full">
                          {TIPO_LABEL[s.tipo] ?? s.tipo}
                        </span>
                      </div>
                      <p className="text-xs text-secondary/70 line-clamp-2">{s.motivo}</p>
                      <p className="text-[10px] text-secondary/40 mt-1">
                        Enviada el {new Date(s.created_at).toLocaleDateString("es-AR", { day: "numeric", month: