import { AutocompleteInput } from "./AutocompleteInput"
import type { AutocompleteKey, FormData } from "./_constants"

/**
 * Renderiza una lista de campos con autocompletado (controlados). El estado vive
 * en el orquestador: recibe los valores (form) y la fábrica de setters por campo.
 * Fragmento hijo directo de la grilla del modal.
 */
export function AutocompleteFields({
  fields,
  form,
  onValue,
}: {
  fields: ReadonlyArray<{ field: AutocompleteKey; label: string }>
  form: FormData
  onValue: (key: AutocompleteKey) => (value: string) => void
}) {
  return (
    <>
      {fields.map(({ field, label }) => (
        <AutocompleteInput
          key={field}
          campo={field}
          label={label}
          value={form[field]}
          onChange={onValue(field)}
        />
      ))}
    </>
  )
}
