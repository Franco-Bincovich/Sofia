"""
Servicio de exportación de reportes a PDF y Excel.
Lee el reporte del repo y delega el render + empaquetado al motor genérico services/export.
Flujo: router → service → repository → DB
"""
from typing import Literal, Optional
from uuid import UUID

from repositories.reporte_repo import ReporteRepo
from services import export
from services.export import Descarga
from utils.errors import AppError


class ReporteExportService:
    def __init__(self, repo: Optional[ReporteRepo] = None) -> None:
        self._repo = repo or ReporteRepo()

    def build_export(self, reporte_id: UUID, formato: Literal["pdf", "excel"]) -> Descarga:
        """
        Exporta el reporte y lo empaqueta para descarga: contenido + filename + media_type.

        Args:
            reporte_id: UUID del reporte a exportar.
            formato: "pdf" o "excel".

        Returns:
            Descarga con content (bytes), filename y media_type.

        Raises:
            AppError: REPORTE_NOT_FOUND (404) si el reporte no existe.
            AppError: EXPORT_ERROR (500) si falla la generación (lo lanza el motor).
        """
        reporte = self._repo.find_by_id(str(reporte_id))
        if not reporte:
            raise AppError("Reporte no encontrado", "REPORTE_NOT_FOUND", 404)
        return export.build_export(
            nombre=reporte.nombre, datos=reporte.datos,
            filename_base=f"reporte_{reporte_id}", formato=formato,
        )
