/**
 * Barra de filtros genérica, presentacional y controlada. Cada campo trae su propio
 * `onChange`: la página conserva su estado (useState), su fetch y su debounce — este
 * componente SOLO renderiza los controles con label visible (patrón AuditFilters, doc
 * UX-UI.md). No fetchea, no debouncea, no tiene estado propio.
 *
 * 3 tipos de control: select (opciones ya resueltas por la página) · search · date.
 */

export type FiltroCampo = { label: string; value: string; onChange: (v: string) => void } & (
  | { tipo: "select"; opciones: { value: string; label: string }[]; opcionTodos?: string }
  | { tipo: "search"; placeholder?: string }
  | { tipo: "date" }
)

interface FiltersBarProps {
  campos: FiltroCampo[]
}

const FIELD_CLASS =
  "min-h-11 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"

export function FiltersBar({ campos }: FiltersBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      {campos.map((campo) => (
        <label key={campo.label} className="flex flex-col gap-1 text-xs text-muted-foreground">
          {campo.label}
          {campo.tipo === "select" ? (
            <select className={FIELD_CLASS} value={campo.value} onChange={(e) => campo.onChange(e.target.value)}>
              <option value="">{campo.opcionTodos ?? "Todos"}</option>
              {campo.opciones.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : campo.tipo === "date" ? (
            <input type="date" className={FIELD_CLASS} value={campo.value} onChange={(e) => campo.onChange(e.target.value)} />
          ) : (
            <input
              type="search"
              className={FIELD_CLASS}
              value={campo.value}
              placeholder={campo.placeholder}
              onChange={(e) => campo.onChange(e.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  )
}
