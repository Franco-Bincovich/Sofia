"""
Servicio de importación masiva de empleados (T18.6b).
Orquesta el CONFIRMAR: re-valida la carrera (duplicados creados entre preview y confirmar),
delega el batch al repo, arma los errores parciales y audita el lote (un evento por lote).
Flujo: router → service → repository.
"""
from typing import List, Optional

from repositories.empleado_import_repo import EmpleadoImportRepo
from schemas.importacion import ConfirmarError, FilaPreview, ImportacionConfirmarResponse
from services._audit_payloads_rrhh import payload_importacion_empleados
from services.audit_service import AuditService
from utils.errors import AppError


def _conflicto_alta(fila: dict, emails: set, dnis: set, legajos: set) -> Optional[str]:
    """Devuelve el motivo si un alta colisiona con un registro creado entre preview y confirmar."""
    if fila["dni"] in dnis:
        return f"El DNI {fila['dni']} ya fue registrado"
    if fila["email_corporativo"] in emails:
        return f"El email {fila['email_corporativo']} ya está en uso"
    if fila.get("legajo") and fila["legajo"] in legajos:
        return f"El legajo {fila['legajo']} ya existe en la empresa"
    return None


class EmpleadoImportService:
    def __init__(self, repo: Optional[EmpleadoImportRepo] = None, audit: Optional[AuditService] = None) -> None:
        self._repo = repo or EmpleadoImportRepo()
        self._audit = audit or AuditService()

    def confirmar(
        self, empresa_id: str, filas: List[FilaPreview], usuario_id: Optional[str] = None,
    ) -> ImportacionConfirmarResponse:
        """
        Aplica el lote: re-chequea la carrera en las altas, inserta lo que sobrevive y
        reporta como error lo que ya no entra. Audita el lote (un único evento).

        Raises:
            AppError: IMPORT_BATCH_ERROR (500) si el batch falla por un motivo no previsto.
        """
        dicts = [{**f.model_dump(), "empresa_id": empresa_id} for f in filas]
        altas = [f for f in dicts if not f["es_actualizacion"]]
        emails = self._repo.existing_emails([a["email_corporativo"] for a in altas])
        dnis = self._repo.existing_dnis(empresa_id, [a["dni"] for a in altas])
        legajos = self._repo.existing_legajos(empresa_id, [a["legajo"] for a in altas if a.get("legajo")])

        errores: List[ConfirmarError] = []
        sobrevivientes: List[dict] = []
        for f in dicts:
            motivo = None if f["es_actualizacion"] else _conflicto_alta(f, emails, dnis, legajos)
            if motivo:
                errores.append(ConfirmarError(fila=f["fila"], error=motivo))
            else:
                sobrevivientes.append(f)

        try:
            aplicados = {r.get("dni") for r in self._repo.batch_upsert_empleados(sobrevivientes)}
        except Exception as exc:
            raise AppError("No se pudo completar la importación", "IMPORT_BATCH_ERROR", 500) from exc

        importados = sum(1 for f in sobrevivientes if not f["es_actualizacion"] and f["dni"] in aplicados)
        actualizados = sum(1 for f in sobrevivientes if f["es_actualizacion"] and f["dni"] in aplicados)
        errores.extend(
            ConfirmarError(fila=f["fila"], error=f"El DNI {f['dni']} ya no existe en la empresa")
            for f in sobrevivientes
            if f["es_actualizacion"] and f["dni"] not in aplicados
        )

        self._audit.registrar(**payload_importacion_empleados(
            empresa_id, importados, actualizados, len(errores), usuario_id,
        ))
        return ImportacionConfirmarResponse(importados=importados, actualizados=actualizados, errores=errores)
