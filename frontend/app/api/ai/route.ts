import { NextRequest, NextResponse } from "next/server"

const MODEL = "claude-sonnet-4-20250514"

const SYSTEM = `Sos el asistente de IA de HR Karstec, una plataforma de gestión del ciclo de vida del empleado.
Tu nombre es HR Karstec. Ayudás al equipo de RRHH con:
- Consultas sobre empleados, cargos, áreas y organigrama
- Análisis de assessments conductuales y cognitivos (modelo AREAS)
- Planes de carrera, sucesión y mapa de talento 9-box
- Vacantes, pipeline de selección y candidatos
- Costos de personal y presupuesto
- Onboarding, offboarding y procesos de RRHH

Respondé siempre en español, de forma concisa y profesional. Si no tenés datos concretos, indicalo claramente.`

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || authHeader.trim() === "") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "API key no configurada" }, { status: 500 })
  }

  let messages: { role: "user" | "assistant"; content: string }[]
  try {
    const body = await req.json()
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: response.status })
  }

  const data = await response.json()
  const content = data.content?.[0]?.text ?? ""
  return NextResponse.json({ content })
}
