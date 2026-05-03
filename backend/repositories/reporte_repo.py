"""
Repositorio de reportes generados — historial persistido en Supabase.
Interfaz pública: save · find_historial
"""
from typing import Any, Dict, List, Optional

from integrations.supabase_client import supabase_admin
from schemas.reporte import HistorialItem, ReporteResponse
from utils.errors import AppError

_TABLE = "reportes_generados"


class ReporteRepo:
    def save(
        self,
        nombre: str,
        tipo: str,
        datos: Dict[str, Any],
        generado_por: str,
        parametros: Optional[Dict[str, Any]] = None,
    ) -> ReporteResponse:
        """
        Persiste un reporte generado en la tabla reportes_generados.

        Args:
            nombre: Título del reporte (ej. 'Headcount — Abril 2026').
            tipo: Clave del tipo de reporte (headcount, rotacion, …).
            datos: Payload completo del reporte en formato dict.
            generado_por: Nombre o email del usuario que lo generó.
            parametros: Parámetros de entrada opcionales (mes, anio, prompt).

        Returns:
            ReporteResponse con los datos persistidos.

        Raises:
            AppError: REPORTE_SAVE_ERROR (500) si la inserción falla.
        """
        payload: Dict[str, Any] = {
            "nombre": nombre,
            "tipo": tipo,
            "datos": datos,
            "generado_por": generado_por,
        }
        if parametros:
            payload["parametros"] = parametros

        res = supabase_admin.table(_TABLE).insert(payload).execute()
        if not res.data:
            raise AppError("Error al guardar el reporte", "REPORTE_SAVE_ERROR", 500)

        r = res.data[0]
        return ReporteResponse(
            id=r["id"],
            nombre=r["nombre"],
            tipo=r["tipo"],
            datos=r["datos"],
            generado_por=r["generado_por"],
            created_at=r["created_at"],
        )

    def find_by_id(self, reporte_id: str) -> Optional[ReporteResponse]:
        """
        Retorna un reporte completo (incluye datos) por su ID.

        Args:
            reporte_id: UUID del reporte.

        Returns:
            ReporteResponse o None si no existe.
        """
        res = (
            supabase_admin.table(_TABLE)
            .select("id, nombre, tipo, datos, generado_por, created_at")
            .eq("id", reporte_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        r = res.data[0]
        return ReporteResponse(
            id=r["id"],
            nombre=r["nombre"],
            tipo=r["tipo"],
            datos=r["datos"],
            generado_por=r["generado_por"],
            created_at=r["created_at"],
        )

    def find_historial(self, limit: int = 50) -> List[HistorialItem]:
        """
        Retorna el historial de reportes generados, ordenado por fecha desc.

        Args:
            limit: Máximo de registros a devolver (default 50).

        Returns:
            Lista de HistorialItem con los metadatos del reporte.
        """
        res = (
            supabase_admin.table(_TABLE)
            .select("id, nombre, tipo, generado_por, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [
            HistorialItem(
                id=r["id"],
                nombre=r["nombre"],
                tipo=r["tipo"],
                generado_por=r["generado_por"],
                created_at=r["created_at"],
            )
            for r in (res.data or [])
        ]
