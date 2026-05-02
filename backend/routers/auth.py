"""
Router de autenticación — login, logout, refresh.
Rate limiting: login está limitado a 5 requests/minuto por IP (slowapi).
"""
from fastapi import APIRouter, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from schemas.auth import LoginRequest, LoginResponse, RefreshRequest, RefreshResponse
from services.auth_service import AuthService
from utils.errors import AppError

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _get_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise AppError("No autorizado", "MISSING_TOKEN", 401)
    return auth[7:]


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
    service: AuthService = Depends(AuthService),
) -> LoginResponse:
    return service.login(body.email, body.password)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    service: AuthService = Depends(AuthService),
) -> None:
    token = _get_token(request)
    service.logout(request.state.user["id"], token)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(
    request: Request,
    body: RefreshRequest,
    service: AuthService = Depends(AuthService),
) -> RefreshResponse:
    return service.refresh_token(body.refresh_token)
