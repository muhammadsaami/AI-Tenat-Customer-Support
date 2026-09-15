from datetime import datetime

import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_role
from app.database import get_db
from app.errors import IngestionError, UploadTooLargeError, UploadValidationError
from app.models import Document
from app.schemas import DocumentOut
from app.services.ingestion import ingest_document
from app.validation import read_upload_limited, safe_filename, validate_extension

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("admin")),
):
    # Validate BEFORE reading: extension + safe filename (no path traversal)
    try:
        validate_extension(file.filename or "")
        safe_name = safe_filename(file.filename or "")
    except UploadValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    # Stream the upload and enforce the size limit while reading
    try:
        file_bytes = await read_upload_limited(file)
    except UploadTooLargeError as e:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(e)) from e
    except UploadValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    doc_id = uuid.uuid4()

    # Create document record
    try:
        doc = Document(
            id=doc_id,
            tenant_id=user.tenant_id,
            filename=safe_name,
            status="processing",
            chunk_count=0,
            created_at=datetime.utcnow(),
        )
        db.add(doc)
        await db.commit()
    except SQLAlchemyError as e:
        logger.error("Failed to create document record for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from e

    # Run real ingestion pipeline
    try:
        result = ingest_document(
            tenant_id=str(user.tenant_id),
            doc_id=str(doc_id),
            filename=safe_name,
            file_bytes=file_bytes,
        )
        # Update document record
        doc.status = "ready"
        doc.chunk_count = result["chunk_count"]
        await db.commit()
    except IngestionError as e:
        logger.error("Ingestion failed for doc_id=%s", doc_id)
        doc.status = "failed"
        try:
            await db.commit()
        except SQLAlchemyError:
            logger.error("Failed to persist failed status for doc_id=%s", doc_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document ingestion failed",
        ) from e
    except SQLAlchemyError as e:
        logger.error("DB failure during ingestion finalize for doc_id=%s", doc_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from e

    logger.info("Upload complete tenant_id=%s doc_id=%s filename=%s chunks=%d",
                user.tenant_id, doc_id, safe_name, result["chunk_count"])

    return DocumentOut(
        id=doc_id,
        filename=safe_name,
        status=doc.status,
        chunk_count=doc.chunk_count,
        created_at=doc.created_at,
    )


@router.get("/", response_model=list[DocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user=Depends(require_role("admin", "agent")),
):
    try:
        result = await db.execute(
            select(Document).where(Document.tenant_id == user.tenant_id)
        )
        documents = result.scalars().all()
    except SQLAlchemyError as e:
        logger.error("DB failure listing documents for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from e

    return [
        DocumentOut(
            id=d.id,
            filename=d.filename,
            status=d.status,
            chunk_count=d.chunk_count,
            created_at=d.created_at,
        )
        for d in documents
    ]