import { useCallback, useEffect, useMemo, useState } from "react";
import { systemApi } from "@/services/api/endpoints";
import { isMockMode } from "@/services/api/client";
import { mockSystemApi } from "@/services/mock/service";
import type { HealthResponse, ReadinessResponse } from "@/types/api";

export function useSystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [generation, setGeneration] = useState(0);

  const refresh = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const api = isMockMode() ? mockSystemApi : systemApi;
    api
      .ready()
      .then((data) => {
        if (!alive) return;
        setReady(data);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setReady(null);
        setError(err);
        setLoading(false);
      });
    api
      .health()
      .then((data) => {
        if (!alive) return;
        setHealth(data);
      })
      .catch(() => {
        /* liveness is best-effort; readiness drives the UI */
      });
    return () => {
      alive = false;
    };
  }, [generation]);

  const operational = useMemo(
    () =>
      ready !== null &&
      ready.status === "ready" &&
      Object.values(ready.checks ?? {}).every(
        (v) => v === "ok" || v === "healthy"
      ),
    [ready]
  );

  return { health, ready, loading, error, operational, refresh };
}