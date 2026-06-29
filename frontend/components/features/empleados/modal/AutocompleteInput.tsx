"use client"

import { useEffect, useMemo, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchValoresConocidos } from "@/services/empleados"

interface AutocompleteInputProps {
  campo: string
  label: string
  value: string
  onChange: (value: string) => void
  id?: string
}

/**
 * Texto libre con sugerencias de selección ÚNICA (sin chips). El valor es estado
 * del orquestador (controlado por props). Las sugerencias se traen LAZY: solo la
 * primera vez que el campo se enfoca, así abrir el modal no dispara 9 requests.
 */
export function AutocompleteInput({ campo, label, value, onChange, id }: AutocompleteInputProps) {
  const inputId = id ?? campo
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused || loaded) return
    setLoaded(true)
    fetchValoresConocidos(campo).then(setSuggestions).catch(() => setSuggestions([]))
  }, [focused, loaded, campo])

  const filtradas = useMemo(() => {
    const q = value.trim().toLowerCase()
    return suggestions
      .filter((s) => s !== value && (q === "" || s.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [suggestions, value])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
        />
        {focused && filtradas.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-input bg-popover p-1 shadow-md">
            {filtradas.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); onChange(s) }}
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-muted"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
