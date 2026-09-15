from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "SupportPilot"
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    # No default credential values: these MUST come from the environment/.env
    APP_SECRET_KEY: str = ""
    # Schema management: production relies on Alembic migrations. create_all is
    # opt-in (local/test convenience only) and does nothing when disabled.
    AUTO_CREATE_TABLES: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/supportpilot"
    DATABASE_ECHO: bool = False

    REDIS_URL: str = "redis://localhost:6380/0"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    # Access-token lifetime: kept short; clients obtain fresh access tokens
    # via the rotating /auth/refresh flow.
    JWT_EXPIRE_MINUTES: int = 15
    # How long a refresh token family remains usable before a re-login is
    # required.
    JWT_REFRESH_EXPIRE_DAYS: int = 30
    REFRESH_TOKEN_BYTES: int = 48

    TENANT_HEADER: str = "X-Tenant-ID"
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    # Upload validation limits
    MAX_UPLOAD_SIZE_BYTES: int = 10_000_000
    MAX_UPLOAD_FILENAME_LENGTH: int = 255
    ALLOWED_UPLOAD_EXTENSIONS: str = ".pdf"

    # Login rate limiting (in-process sliding window)
    LOGIN_RATE_LIMIT_ENABLED: bool = True
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 300

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if not self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be set (min 32 characters) via .env or environment"
            )
        return self


settings = Settings()