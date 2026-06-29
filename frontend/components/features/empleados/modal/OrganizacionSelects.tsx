import type { ChangeEvent } from "react"

import { Label } from "@/components/ui/label"
import { SELECT_CLASS, type FieldFactory, type FormData, type FormErrors } from "./_constants"
import type { Area } from "@/types/area"
import type { Empresa } from "@/types/empresa"

interface Props {
  form: FormData
  errors: FormErrors
  isEdit: boolean
  empresas: Empresa[]
  empresasLoading: boolean
  areas: Area[]
  areasLoading: boolean
  field: FieldFactory
  onEmpresaChange: (e: ChangeEvent<HTMLSelectElement>) => void
}

/**
 * Selects de empresa (solo crear) y área (filtrada por empresa en crear, todas en
 * editar). Controlado por el orquestador. Fragmento hijo directo de la grilla.
 */
export function OrganizacionSelects({
  form, errors, isEdit, empresas, empresasLoading, areas, areasLoading, field, onEmpresaChange,
}: Props) {
  return (
    <>
      {!isEdit && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="empresa_id">
            Empresa
            <span className="ml-0.5 text-destructive" aria-hidden>*</span>
          </Label>
          <select
            id="empresa_id"
            className={SELECT_CLASS}
            value={form.empresa_id}
            onChange={onEmpresaChange}
            disabled={empresasLoading}
            aria-invalid={Boolean(errors.empresa_id)}
            aria-required
          >
            <option value="">
              {empresasLoading ? "Cargando..." : "Seleccionar empresa"}
            </option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.nombre}</option>
            ))}
          </select>
          {errors.empresa_id && (
            <p className="text-xs text-destructive" role="alert">{errors.empresa_id}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="area_id">
          Área
          <span className="ml-0.5 text-destructive" aria-hidden>*</span>
        </Label>
        <select
          id="area_id"
          className={SELECT_CLASS}
          value={form.area_id}
          onChange={field("area_id")}
          disabled={areasLoading || (!isEdit && !form.empresa_id)}
          aria-invalid={Boolean(errors.area_id)}
          aria-required
        >
          <option value="">
            {areasLoading
              ? "Cargando áreas..."
              : !isEdit && !form.empresa_id
              ? "Primero seleccioná una empresa"
              : "Seleccionar área"}
          </option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        {errors.area_id && (
          <p className="text-xs text-destructive" role="alert">{errors.area_id}</p>
        )}
      </div>
    </>
  )
}
