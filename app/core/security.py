"""Authentication and authorization helpers."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from jose import jwt

from app.api.dependencies import get_settings
from app.core.config import Settings

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def verify_token(self, token: str) -> dict:
        if not self.settings.cognito_user_pool_id:
            return {"sub": "anonymous"}

        try:
            claims = jwt.get_unverified_claims(token)
        except Exception as exc:  # pragma: no cover - external lib
            logger.warning("Failed to decode token: %s", exc)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        return claims


def get_auth_service(settings: Settings = Depends(get_settings)) -> AuthService:
    return AuthService(settings)


def authenticated_user(
    authorization: Optional[str] = None,
    auth_service: AuthService = Depends(get_auth_service),
) -> dict:
    if not authorization:
        if auth_service.settings.cognito_user_pool_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
        return {"sub": "anonymous"}

    token = authorization.replace("Bearer ", "")
    return auth_service.verify_token(token)


