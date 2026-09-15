import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TenantSignup(BaseModel):
    tenant_name: str = Field(..., min_length=1, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=32, max_length=512)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., min_length=32, max_length=512)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: str
    tenant_id: uuid.UUID


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    status: str
    chunk_count: int
    created_at: datetime


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)


class ChatSource(BaseModel):
    doc_id: str
    filename: str
    chunk_index: int
    distance: float
    preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
