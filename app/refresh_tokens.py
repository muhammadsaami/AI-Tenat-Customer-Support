"""Rotating refresh-token flow.

Design:
- The raw refresh token is a high-entropy random string returned to the
  client exactly once. Only its SHA-256 digest is persisted.
- Every refresh consumes the presented token and mints a new one in the
  SAME family. Reusing an already-consumed token is treated as theft: the
  entire family (all sessions born from that login) is revoked.
- Access tokens stay short-lived (settings.JWT_EXPIRE_MINUTES); the refresh
  flow is the only way to mint new ones.
"""

import hashlib
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import select

from app.auth import create_access_token
from app.config import settings
from app.models import RefreshToken, User

ACCESS_FIELD = "access_token"
REFRESH_FIELD = "refresh_token"


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_refresh_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(settings.REFRESH_TOKEN_BYTES)
    return raw, hash_refresh_token(raw)


class RefreshTokenRepo:
    """Thin ORM adapter so the rotation logic is unit-testable."""

    def __init__(self, db):
        self._db = db

    async def get_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        result = await self._db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_family(self, family_id: uuid.UUID) -> List[RefreshToken]:
        result = await self._db.execute(
            select(RefreshToken).where(RefreshToken.family_id == family_id)
        )
        return list(result.scalars().all())

    async def get_user(self, user_id) -> Optional[User]:
        result = await self._db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def add(self, record: RefreshToken) -> None:
        self._db.add(record)

    async def commit(self) -> None:
        await self._db.commit()


@dataclass
class RotationResult:
    status: str  # "ok" | "invalid"
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


async def create_login_refresh(repo: RefreshTokenRepo, user: User) -> str:
    """Create a fresh refresh-token family for a login. Returns the raw token."""
    raw, digest = generate_refresh_token()
    ttl = timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    await repo.add(
        RefreshToken(
            user_id=user.id,
            token_hash=digest,
            family_id=uuid.uuid4(),
            expires_at=datetime.utcnow() + ttl,
        )
    )
    await repo.commit()
    return raw


async def rotate_refresh_token(
    repo: RefreshTokenRepo, raw_token: str
) -> RotationResult:
    """Validate, consume, rotate, and issue new tokens. Returns result."""
    now = datetime.utcnow()
    record = await repo.get_by_hash(hash_refresh_token(raw_token))
    if record is None or now >= record.expires_at:
        return RotationResult(status="invalid")
    if record.revoked_at is not None:
        # A consumed token was presented again: assume theft, kill the family.
        await _revoke_family(repo, record.family_id, now)
        return RotationResult(status="invalid")
    user = await repo.get_user(record.user_id)
    if user is None:
        return RotationResult(status="invalid")

    record.revoked_at = now
    new_raw, new_digest = generate_refresh_token()
    ttl = timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    await repo.add(
        RefreshToken(
            user_id=user.id,
            token_hash=new_digest,
            family_id=record.family_id,
            expires_at=now + ttl,
        )
    )
    await repo.commit()
    return RotationResult(
        status="ok",
        access_token=create_access_token(
            str(user.id), str(user.tenant_id), user.role.value
        ),
        refresh_token=new_raw,
    )


async def revoke_family_by_token(
    repo: RefreshTokenRepo, raw_token: str
) -> bool:
    """Revoke the whole family owning `raw_token`. True if any token revoked."""
    now = datetime.utcnow()
    record = await repo.get_by_hash(hash_refresh_token(raw_token))
    if record is None:
        return False
    await _revoke_family(repo, record.family_id, now)
    return True


async def _revoke_family(
    repo: RefreshTokenRepo, family_id: uuid.UUID, now: datetime
) -> None:
    for record in await repo.get_family(family_id):
        record.revoked_at = now
    await repo.commit()