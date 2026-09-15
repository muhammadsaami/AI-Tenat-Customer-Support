import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.logging_config import setup_logging
from app.services.vectorstore import vector_store
from app.routers import auth as auth_router
from app.routers import chat as chat_router
from app.routers import documents as documents_router
from app import models  # noqa: F401 — ensures models are registered with Base

setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic migrations (alembic upgrade head).
    # Create_all is a local/test shortcut, explicitly opt-in via
    # AUTO_CREATE_TABLES and disabled in production.
    if settings.AUTO_CREATE_TABLES:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(
            "Auto-created tables via create_all (AUTO_CREATE_TABLES=true, "
            "local/test only). Production should use 'alembic upgrade head'."
        )
    else:
        logger.info("Schema managed by Alembic migrations.")
    yield
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.include_router(auth_router.router)
app.include_router(documents_router.router)
app.include_router(chat_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/health/ready")
async def health_ready():
    checks: dict[str, str] = {}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception:
        logger.error("Readiness check failed: postgres")
        checks["postgres"] = "error"

    checks["chroma"] = "ok" if vector_store.heartbeat() else "error"
    if checks["chroma"] != "ok":
        logger.error("Readiness check failed: chroma")

    checks["redis"] = "not_configured"
    try:
        import redis.asyncio as aioredis

        client = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        try:
            pong = await client.ping()
            checks["redis"] = "ok" if pong else "error"
        finally:
            await client.aclose()
    except ImportError:
        pass
    except Exception:
        logger.error("Readiness check failed: redis")
        checks["redis"] = "error"

    required = ("postgres", "chroma")
    ready = all(checks.get(k) == "ok" for k in required)
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "ready" if ready else "not_ready", "checks": checks},
    )