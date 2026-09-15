import logging

from groq import APIConnectionError, APIError, AuthenticationError, Groq, NotFoundError, RateLimitError

from app.config import settings
from app.errors import LLMError

logger = logging.getLogger(__name__)

_client = Groq(api_key=settings.GROQ_API_KEY, timeout=30.0, max_retries=2)


def generate_answer(question: str, context_chunks: list[dict]) -> str:
    """Generate an answer using Groq's LLM with retrieved context.

    The system prompt instructs the model to answer ONLY from the provided
    context and to be honest if the context doesn't contain the answer.
    """
    context_text = "\n\n".join(
        [f"[Chunk {c['chunk_index'] + 1}]: {c['text']}" for c in context_chunks]
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant that answers questions based ONLY on the "
                "provided context chunks. If the context does not contain enough information "
                "to answer the question, say so clearly. Do not make up information."
            ),
        },
        {
            "role": "user",
            "content": f"Context:\n{context_text}\n\nQuestion: {question}",
        },
    ]

    try:
        response = _client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.1,
            max_tokens=512,
        )
        return response.choices[0].message.content
    except AuthenticationError as e:
        logger.error("Groq authentication failed; check GROQ_API_KEY")
        raise LLMError("LLM service authentication failed") from e
    except NotFoundError as e:
        logger.error("Groq model %s not found or not accessible", settings.GROQ_MODEL)
        raise LLMError("LLM model not found or not accessible") from e
    except RateLimitError as e:
        logger.error("Groq rate limit hit")
        raise LLMError("LLM service rate limited") from e
    except (APIConnectionError, APIError) as e:
        logger.error("Groq upstream error: %s", e.__class__.__name__)
        raise LLMError("LLM service unavailable") from e
    except Exception as e:
        logger.error("Unexpected LLM error: %s", e.__class__.__name__)
        raise LLMError("Unexpected LLM failure") from e