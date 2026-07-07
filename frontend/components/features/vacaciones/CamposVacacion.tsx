"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  SELECT_CLASS, TIPOS_VACACION, type VacacionFormData, type VacacionFormErrors,
} from "./vacacionesForm"

type FieldHandler = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
) => void

interface CamposVacacionProps {
  form: VacacionFormData
  errors: VacacionFormErrors
  field: (key: keyof VacacionFormData) => FieldHandler
}

/** Campos propios del alta de vacaciones (tipo + rango de fechas + comentario). Presentacional. */
export function CamposVacacion({ form, errors, field }: CamposVacacionProps) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tipo">Tipo</Label>
        <select id="tipo" className={SELECT_CLASS} value={form.tipo} onChange={field("tipo")}>
          {TIPOS_VACACION.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fecha_desde">Desde <span className="text-destructive" aria-hidden>*</span></Label>
          <Input id="fecha_desde" type="date" value={form.fecha_desde} onChange={field("fecha_desde")} aria-required aria-invalid={Boolean(errors.fecha_desde)} />
          {errors.fecha_desde && <p className="text-xs text-destructive" role="alert">{errors.fecha_desde}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fecha_hasta">Hasta <span className="text-destructive" aria-hidden>*</span></Label>
          <Input id="fecha_hasta" type="date" value={form.fecha_hasta} min={form.fecha_desde} onChange={field("fecha_hasta")} aria-required aria-invalid={Boolean(errors.fecha_hasta)} />
          {errors.fecha_hasta && <p className="text-xs text-destructive" role="alert">{errors.fecha_hasta}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comentario">Comentario</Label>
        <Textarea id="comentario" value={form.comentario} onChange={field("comentario")} rows={2} className="resize-none" />
      </div>
    </>
  )
}
