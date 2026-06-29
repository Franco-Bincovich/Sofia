import type { ChangeEvent } from "react"

export type FormData = {
  empresa_id: string
  nombre: string
  apellido: string
  email_corporativo: string
  area_id: string
  roles: string[]
  modalidad_trabajo: string
  tipo_contrato: string
  fecha_ingreso: string
  telefono: string
  fecha_nacimiento: string
  dni: string
  cuil: string
  legajo: string
  dias_vacaciones_asignados: string
  // Legajo ampliado (A1.3b)
  tipo_documento: string
  sexo: string
  telefono_alternativo: string
  email_personal: string
  domicilio: string
  estudios: string
  ubicacion: string
  turno: string
  horas_contrato: string
  organismo: string
  gerencia: string
  sector: string
  seniority: string
  perfil: string
  categoria: string
  modalidad_contratacion: string
  referido: string
  es_lider: boolean
}

export type FormErrors = Partial<Record<keyof FormData, string>>

/** Claves de campos de texto (string). Excluye roles (lista) y es_lider (booleano). */
export type TextKey = Exclude<keyof FormData, "roles" | "es_lider">
/** Claves con autocompletado de texto libre + sugerencias (single-value). */
export type AutocompleteKey =
  | "tipo_documento" | "ubicacion" | "organismo" | "gerencia" | "sector"
  | "seniority" | "perfil" | "categoria" | "modalidad_contratacion"

/** Handler de cambio de un input/select controlado del form. */
export type FieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
/** Fábrica de handlers por campo de texto (el orquestador es dueño del estado). */
export type FieldFactory = (key: TextKey) => FieldChange

export type TextField = {
  field: TextKey
  label: string
  required?: boolean
  type?: string
  placeholder?: string
}

export const EMPTY: FormData = {
  empresa_id: "",
  nombre: "",
  apellido: "",
  email_corporativo: "",
  area_id: "",
  roles: [],
  modalidad_trabajo: "presencial",
  tipo_contrato: "efectivo",
  fecha_ingreso: "",
  telefono: "",
  fecha_nacimiento: "",
  dni: "",
  cuil: "",
  legajo: "",
  dias_vacaciones_asignados: "14",
  tipo_documento: "",
  sexo: "",
  telefono_alternativo: "",
  email_personal: "",
  domicilio: "",
  estudios: "",
  ubicacion: "",
  turno: "",
  horas_contrato: "",
  organismo: "",
  gerencia: "",
  sector: "",
  seniority: "",
  perfil: "",
  categoria: "",
  modalidad_contratacion: "",
  referido: "",
  es_lider: false,
}

// Personal, en orden: identidad → documento (tipo + número + CUIT/CUIL) → resto.
export const PERSONAL_IDENTITY_FIELDS: TextField[] = [
  { field: "nombre", label: "Nombre", required: true },
  { field: "apellido", label: "Apellido", required: true },
]

// Documento: van JUNTO al autocompletado tipo_documento (tipo + número).
export const PERSONAL_DOC_FIELDS: TextField[] = [
  { field: "dni", label: "Documento" },
  { field: "cuil", label: "CUIT/CUIL" },
]

export const PERSONAL_CONTACT_FIELDS: TextField[] = [
  { field: "legajo", label: "Legajo" },
  { field: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
  { field: "telefono", label: "Teléfono", type: "tel" },
  { field: "telefono_alternativo", label: "Teléfono alternativo", type: "tel" },
  { field: "email_corporativo", label: "Email corporativo", required: true, type: "email" },
  { field: "email_personal", label: "Email alternativo", type: "email" },
  { field: "domicilio", label: "Domicilio" },
  { field: "estudios", label: "Estudios" },
]

export const LABORAL_TEXT_FIELDS: TextField[] = [
  { field: "turno", label: "Turno", placeholder: "Ej: 8 a 17 hs" },
  { field: "horas_contrato", label: "Horas por día", type: "number" },
  { field: "fecha_ingreso", label: "Fecha de ingreso", required: true, type: "date" },
  { field: "referido", label: "Referido" },
  { field: "dias_vacaciones_asignados", label: "Días de vacaciones asignados", type: "number" },
]

export const PERSONAL_AUTOCOMPLETE: ReadonlyArray<{ field: AutocompleteKey; label: string }> = [
  { field: "tipo_documento", label: "Tipo de documento" },
]

export const LABORAL_AUTOCOMPLETE: ReadonlyArray<{ field: AutocompleteKey; label: string }> = [
  { field: "ubicacion", label: "Ubicación" },
  { field: "organismo", label: "Organismo" },
  { field: "gerencia", label: "Gerencia" },
  { field: "sector", label: "Sector" },
  { field: "seniority", label: "Seniority" },
  { field: "perfil", label: "Perfil" },
  { field: "categoria", label: "Categoría" },
  { field: "modalidad_contratacion", label: "Modalidad de contratación" },
]

export const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
