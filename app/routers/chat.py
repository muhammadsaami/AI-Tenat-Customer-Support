import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.errors import EmbeddingError, LLMError, VectorStoreError
from app.models import Document, User
from app.schemas import ChatRequest, ChatResponse, ChatSource
from app.services.embeddings import embed_query
from app.services.llm import generate_answer
from app.services.vectorstore import query_tenant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Embed the question with the real query embedding model
    try:
        query_embedding = embed_query(data.question)
    except EmbeddingError as e:
        logger.error("Embedding failed for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Embedding generation failed",
        ) from e

    # Retrieve chunks from THIS tenant's collection only
    try:
        chunks = query_tenant(str(user.tenant_id), query_embedding, top_k=4)
    except VectorStoreError as e:
        logger.error("Vector store query failed for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector store unavailable",
        ) from e

    # Generate answer using Groq LLM with the real retrieved chunks
    try:
        answer = generate_answer(data.question, chunks)
    except LLMError as e:
        logger.error("LLM request failed for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="LLM service unavailable",
        ) from e

    # Look up real filenames for the retrieved documents from Postgres
    try:
        doc_ids = {uuid.UUID(c["doc_id"]) for c in chunks}
        filenames = {}
        if doc_ids:
            result = await db.execute(
                select(Document.id, Document.filename).where(Document.id.in_(doc_ids))
            )
            for doc_id, filename in result.all():
                filenames[str(doc_id)] = filename
    except SQLAlchemyError as e:
        logger.error("DB failure resolving filenames for tenant %s", user.tenant_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from e

    sources = [
        ChatSource(
            doc_id=c["doc_id"],
            filename=filenames.get(c["doc_id"], "unknown"),
            chunk_index=c["chunk_index"],
            distance=c["distance"],
            preview=c["text"][:300],
        )
        for c in chunks
    ]

    return ChatResponse(answer=answer, sources=sources)