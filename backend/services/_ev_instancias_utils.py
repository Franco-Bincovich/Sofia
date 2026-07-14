"""
Helpers puros de instancias de evaluación. Separado de ev_instancias_service para
mantener el service bajo el límite de líneas al instrumentar auditoría (el cálculo de
puntaje no depende del estado del service).
"""
from typing import Optional

from utils.errors import AppError


def calcular_puntaje_global(instancia) -> Optional[float]:
    """Puntaje global de una instancia finalizada.

    Numérica: promedio ponderado Σ(puntaje×peso)/Σ(peso) — requiere todos los puntajes
    cargados. Cualitativa: None (los valores cualitativos se leen directamente).

    Raises:
        AppError: RESULTADOS_INCOMPLETOS (422) si la escala es numérica y faltan puntajes.
    """
    if instancia.plantilla_tipo_escala != "numerica":
        return None
    vacios = [r for r in instancia.resultados if r.puntaje is None]
    if vacios:
        faltantes = ", ".join(r.criterio_nombre for r in vacios)
        raise AppError(f"Faltan puntajes en: {faltantes}", "RESULTADOS_INCOMPLETOS", 422)
    suma_pond = sum(r.puntaje * r.criterio_peso for r in instancia.resultados)  # type: ignore[operator]
    suma_pesos = sum(r.criterio_peso for r in instancia.resultados)
    return round(suma_pond / suma_pesos, 2) if suma_pesos else None
