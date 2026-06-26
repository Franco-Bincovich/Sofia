"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"

import { Label } from "@/components/ui/label"

interface RolesInputProps {
  value: string[]
  onChange: (roles: string[]) => void
  suggestions: string[]
  label?: string
  required?: boolean
  id?: string
}

/**
 * Input multi-valor de roles: texto libre con chips + autocompletado.
 * Enter o coma agrega el rol tipeado; la X lo quita. Las sugerencias salen del
 * pool compartido (todas las empresas) y se filtran por lo que se escribe.
 */
export function RolesInput({ value, onChange, suggestions, label, required, id = "roles" }: RolesInputProps) {
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)

  const filtradas = useMemo(() => {
    const q = text.trim().toLowerCase()
    return suggestions
      .filter((s) => !value.includes(s) && (q === "" || s.toLowerCase().includes(q)))
      .slice(0, 8)
  }, [suggestions, value, text])

  function add(raw: string) {
    const v = raw.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setText("")
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add(text)
    } else if (e.key === "Backspace" && text === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label ?? "Roles"}
        {required && <span className="ml-0.5 text-destructive" aria-hidden>*</span>}
      </Label>
      <div className="relative">
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent p-1.5 focus-within:ring-2 focus-within:ring-ring/50">
          {value.map((rol) => (
            <span
              key={rol}
              className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-3 pr-1 text-sm text-secondary-foreground"
            >
              {rol}
              <button
                type="button"
                aria-label={`Quitar ${rol}`}
                onClick={() => onChange(value.filter((r) => r !== rol))}
                className="flex size-11 items-center justify-center rounded-full hover:bg-background/60"
              >
                <X className="size-4" />
              </button>
            </span>
          ))}
          <input
            id={id}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={value.length === 0 ? "Escribí un rol y presioná Enter" : ""}
            className="min-h-9 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            aria-required={required}
          />
        </div>
        {focused && filtradas.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-input bg-popover p-1 shadow-md">
            {filtradas.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(s) }}
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
