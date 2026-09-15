import { useCallback, useEffect, useMemo, useState } from "react";
import { documentsApi } from "@/services/api/endpoints";
import { isMockMode } from "@/services/api/client";
import { mockDocumentsApi } from "@/services/mock/service";
import type { DocumentOut } from "@/types/api";

export interface DocumentStats {
  documents: number;
  indexedDocuments: number;
  processing: number;
  failed: number;
  totalChunks: number;
}

export function useDocuments() {
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const api = isMockMode() ? mockDocumentsApi : documentsApi;
    api
      .list()
      .then((data) => {
        if (!alive) return;
        setDocs(Array.isArray(data) ? data : []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setDocs([]);
        setError(err);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [generation]);

  const stats: DocumentStats = useMemo(() => {
    const ready = docs.filter((d) => d.status === "ready").length;
    const failed = docs.filter((d) => d.status === "failed").length;
    const processing = docs.filter((d) => d.status === "processing").length;
    return {
      documents: docs.length,
      indexedDocuments: ready,
      processing,
      failed,
      totalChunks: docs.reduce((s, d) => s + (d.chunk_count ?? 0), 0),
    };
  }, [docs]);

  return { docs, loading, error, refresh, stats };
}