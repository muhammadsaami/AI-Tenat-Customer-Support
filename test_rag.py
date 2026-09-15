import uuid

from app.services.ingestion import ingest_document
from app.services.embeddings import embed_texts
from app.services.vectorstore import query_tenant

# Use the real tenant_id from our earlier signup test
TENANT_ID = "37c78f31-e5d8-4d0b-8ee4-7a0e65dffd59"

# Read the real PDF from disk
pdf_path = r"C:\Users\khans\Downloads\Muhammad_Sami_Resume (2).pdf"
with open(pdf_path, "rb") as f:
    file_bytes = f.read()

print(f"Read PDF: {len(file_bytes)} bytes")

# Ingest the document
doc_id = str(uuid.uuid4())
result = ingest_document(
    tenant_id=TENANT_ID,
    doc_id=doc_id,
    filename="Muhammad_Sami_Resume.pdf",
    file_bytes=file_bytes,
)
print(f"Ingestion result: {result}")

# Query the document
query = "What skills does this person have?"
query_embedding = embed_texts([query])[0]
results = query_tenant(TENANT_ID, query_embedding, top_k=3)

print(f"\nQuery: '{query}'\n")
print(f"Retrieved {len(results)} chunks:\n")
for i, r in enumerate(results, 1):
    print(f"--- Chunk {i} (distance: {r['distance']:.4f}) ---")
    print(r["text"][:300])
    print()
