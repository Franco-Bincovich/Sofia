"""
Router de Configuración de Empresa — GET y PUT del perfil de la organización.
Rutas protegidas por AuthMiddleware (requieren JWT válido).
"""
from fastapi import APIRouter, Depends

from repositories.empresa_repo import EmpresaRepo
from schemas.empresa import EmpresaResponse, EmpresaUpdate
from utils.errors import AppError

router = APIRouter()


def _repo() -> EmpresaRepo:
    return EmpresaRepo()


@router.get("", response_model=EmpresaResponse)
async def get_empresa(repo: EmpresaRepo = Depends(_repo)) -> EmpresaResponse:
    config = repo.get_config()
    if not config:
        raise AppError("Configuración de empresa no encontrada", "EMPRESA_NOT_FOUND", 404)
    return config


@router.put("", response_model=EmpresaResponse)
async def update_empresa(
    body: EmpresaUpdate,
    repo: EmpresaRepo = Depends(_repo),
) -> EmpresaResponse:
    updated = repo.update_config(body)
    if not updated:
        raise AppError("Configuración de empresa no encontrada", "EMPRESA_NOT_FOUND", 404)
    return updated
