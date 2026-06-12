"""
Generador de reportes Ad Hoc — análisis en lenguaje natural vía Claude.
Acepta empresa_id para contextualizar los datos con los de una empresa específica.
Módulo auxiliar — usar desde ReporteService.
"""
from datetime import date
from typing import Any, Dict, Optional
from uuid import UUID

import anthropic

from config.settings import settings
from integrations.supabase_client import supabase_admin
from utils.errors import AppError


def generate_adhoc(prompt: str, empresa_id: Optional[UUID] = None) -> Dict[str, Any]:
    """
    Genera un análisis en lenguaje natural usando Claude como motor de IA.
    Recopila datos HR de la empresa indicada (o de todas si empresa_id es None)
    y los incluye como contexto para el modelo.

    Args:
        prompt: Descripción del reporte solicitado por el usuario.
        empresa_id: Empresa a analizar. None = datos consolidados de todas.

    Returns:
        Dict con el análisis generado por IA y el contexto de datos utilizado.

    Raises:
        AppError: ADHOC_PROMPT_REQUIRED (400) si el prompt está vacío.
    """
    if not prompt.strip():
        raise AppError("El prompt del reporte Ad Hoc no puede estar vacío", "ADHOC_PROMPT_REQUIRED", 400)

    hoy = date.today()
    eid = str(empresa_id) if empresa_id else None
    db = supabase_admin

    activos_q = db.table("empleados").select("id", count="exact").eq("estado", "activo")
    if eid:
        activos_q = activos_q.eq("empresa_id", eid)
    activos = activos_q.execute().count or 0

    vacantes_q = db.table("vacantes").select("id", count="exact").neq("estado", "cerrada")
    if eid:
        vacantes_q = vacantes_q.eq("empresa_id", eid)
    vacantes_activas = vacantes_q.execute().count or 0

    onb_q = db.table("onboarding_instancias").select("id", count="exact").eq("estado", "en_progreso")
    if eid:
        onb_q = onb_q.eq("empresa_id", eid)
    onboardings = onb_q.execute().count or 0

    ini = date(hoy.year, hoy.month, 1).isoformat()
    ingresos_q = db.table("empleados").select("id", count="exact").gte("fecha_ingreso", ini)
    if eid:
        ingresos_q = ingresos_q.eq("empresa_id", eid)
    ingresos = ingresos_q.execute().count or 0

    scope = "empresa activa" if eid else "todas las empresas (consolidado)"
    contexto = (
        f"Datos actuales de RRHH — {scope} (al {hoy.isoformat()}):\n"
        f"- Empleados activos: {activos}\n"
        f"- Ingresos este mes: {ingresos}\n"
        f"- Vacantes activas: {vacantes_activas}\n"
        f"- Onboardings en curso: {onboardings}\n"
    )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[
            {
                "role": "user",
                "content": (
                    f"Sos el asistente de RRHH de Karstec. Tenés acceso a los siguientes datos:\n\n"
                    f"{contexto}\n\n"
                    f"El usuario solicita: {prompt}\n\n"
                    "Generá un análisis claro, conciso y orientado a la acción. "
                    "Respondé en español. Estructurá la respuesta con secciones si aplica."
                ),
            }
        ],
    )

    analisis = message.content[0].text if message.content else "No se pudo generar el análisis."

    return {
        "titulo": f"Análisis IA: {prompt[:60]}",
        "prompt": prompt,
        "analisis": analisis,
        "contexto_datos": contexto,
    }
