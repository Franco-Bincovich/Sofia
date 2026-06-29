import type { ChangeEvent } from "react"

import { Label } from "@/components/ui/label"
import { RolesInput } from "@/components/ui/RolesInput"
import { TextFields } from "./TextFields"
import { AutocompleteFields } from "./AutocompleteFields"
import { OrganizacionSelects } from "./OrganizacionSelects"
import {
  LABORAL_AUTOCOMPLETE, LABORAL_TEXT_FIELDS, SELECT_CLASS,
  type AutocompleteKey, type FieldFactory, type FormData, type FormErrors,
} from "./_constants"
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
  rolesSugeridos: string[]
  field: FieldFactory
  onEmpresaChange: (e: ChangeEvent<HTMLSelectElement>) => void
  onRolesChange: (roles: string[]) => void
  onValue: (key: AutocompleteKey) => (value: string) => void
  onLider: (value: boolean) => void
}

/**
 * Sección "Información laboral" (controlada): roles, empresa/área, modalidad de
 * trabajo, datos de contrato (turno/horas/ingreso/referido/días), liderazgo y los
 * catálogos con autocompletado. El estado vive en el orquestador.
 */
export function DatosLaboralesFields({
  form, errors, isEdit, empresas, empresasLoading, areas, areasLoading,
  rolesSugeridos, field, onEmpresaChange, onRolesChange, onValue, onLider,
}: Props) {
  return (
    <>
      <div className="sm:col-span-2">
        <RolesInput
          label="Roles"
          required
          value={form.roles}
          suggestions={rolesSugeridos}
          onChange={onRolesChange}
        />
        {errors.roles && (
          <p className="mt-1.5 text-xs text-destructive" role="alert">{errors.roles}</p>
        )}
      </div>

      <OrganizacionSelects
        form={form}
        errors={errors}
        isEdit={isEdit}
        empresas={empresas}
        empresasLoading={empresasLoading}
        areas={areas}
        areasLoading={areasLoading}
        field={field}
        onEmpresaChange={onEmpresaChange}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="modalidad_trabajo">Modalidad de trabajo</Label>
        <select
          id="modalidad_trabajo"
          className={SELECT_CLASS}
          value={form.modalidad_trabajo}
          onChange={field("modalidad_trabajo")}
        >
          <option value="presencial">Presencial</option>
          <option value="remoto">Remoto</option>
          <option value="hibrido">Híbrido</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tipo_contrato">Tipo de contrato</Label>
        <select
          id="tipo_contrato"
          className={SELECT_CLASS}
          value={form.tipo_contrato}
          onChange={field("tipo_contrato")}
        >
          <option value="efectivo">Relación de dependencia</option>
          <option value="plazo_fijo">Plazo fijo</option>
          <option value="contratado">Contratado</option>
          <option value="pasantia">Pasantía</option>
        </select>
      </div>

      <TextFields fields={LABORAL_TEXT_FIELDS} form={form} errors={errors} field={field} />

      <AutocompleteFields fields={LABORAL_AUTOCOMPLETE} form={form} onValue={onValue} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="es_lider">Liderazgo</Label>
        <label
          htmlFor="es_lider"
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-input px-3"
        >
          <input
            id="es_lider"
            type="checkbox"
            checked={form.es_lider}
            onChange={(e) => onLider(e.target.checked)}
            className="size-4"
          />
          <span className="text-sm text-foreground">Líder</span>
        </label>
      </div>
    </>
  )
}
