import { ENTIDAD_LABEL, EVENTO_LABEL } from "@/components/features/auditoria/auditLabels"
import type { AuditoriaFiltros } from "@/services/auditoria"
import type { UsuarioOption } from "@/services/usuarios"

interface AuditFiltersProps {
  filtros: AuditoriaFiltros
  onChange: (filtros: AuditoriaFiltros) => void
  usuarios: UsuarioOption[]
}

const FIELD_CLASS =
  "min-h-11 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

/** Barra de filtros de auditoría. Cada control tiene label visible (doc UX). */
export function AuditFilters({ filtros, onChange, usuarios }: AuditFiltersProps) {
  function set(campo: keyof AuditoriaFiltros, valor: string) {
    onChange({ ...filtros, [campo]: valor || undefined })
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Sección
        <select className={FIELD_CLASS} value={filtros.entidad ?? ""} onChange={(e) => set("entidad", e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(ENTIDAD_LABEL).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Evento
        <select className={FIELD_CLASS} value={filtros.evento ?? ""} onChange={(e) => set("evento", e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(EVENTO_LABEL).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Usuario
        <select className={FIELD_CLASS} value={filtros.usuario_id ?? ""} onChange={(e) => set("usuario_id", e.target.value)}>
          <option value="">Todos</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Desde
        <input type="date" className={FIELD_CLASS} value={filtros.fecha_desde ?? ""} onChange={(e) => set("fecha_desde", e.target.value)} />
      </label>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Hasta
        <input type="date" className={FIELD_CLASS} value={filtros.fecha_hasta ?? ""} onChange={(e) => set("fecha_hasta", e.target.value)} />
      </label>
    </div>
  )
}
