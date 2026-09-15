import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.config import settings
from app.database import get_db
from app.models import Tenant, User, UserRole
from app.ratelimit import login_limiter
from app.refresh_tokens import (
    RefreshTokenRepo,
    create_login_refresh,
    hash_refresh_token,
    revoke_family_by_token,
    rotate_refresh_token,
)
from app.schemas import (
    LogoutRequest,
    RefreshRequest,
    TenantSignup,
    TokenResponse,
    UserLogin,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(data: TenantSignup, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == data.admin_email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create tenant and admin user in one transaction
    tenant = Tenant(id=uuid.uuid4(), name=data.tenant_name)
    admin = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email=data.admin_email,
        hashed_password=hash_password(data.admin_password),
        role=UserRole.admin,
    )
    db.add(tenant)
    db.add(admin)
    await db.commit()

    refresh_raw = await create_login_refresh(RefreshTokenRepo(db), admin)
    access_token = create_access_token(
        user_id=str(admin.id),
        tenant_id=str(tenant.id),
        role=admin.role.value,
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_raw)


def _login_key(request: Request, email: str) -> str:
    client_ip = request.client.host if request.client else "unknown"
    return f"{client_ip}|{email.strip().lower()}"


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    key = _login_key(request, data.email)
    if not login_limiter.allowed(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
            headers={"Retry-After": str(settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)},
        )

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(data.password, user.hashed_password):
        login_limiter.record_failure(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    login_limiter.clear(key)
    refresh_raw = await create_login_refresh(RefreshTokenRepo(db), user)
    access_token = create_access_token(
        user_id=str(user.id),
        tenant_id=str(user.tenant_id),
        role=user.role.value,
    )
    return TokenResponse(access_token=access_token, refresh_token=refresh_raw)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await rotate_refresh_token(RefreshTokenRepo(db), data.refresh_token)
    if result.status != "ok":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    return TokenResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    data: LogoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = RefreshTokenRepo(db)
    record = await repo.get_by_hash(hash_refresh_token(data.refresh_token))
    if record is None or record.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    await revoke_family_by_token(repo, data.refresh_token)
    return {"detail": "Logged out"}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user
