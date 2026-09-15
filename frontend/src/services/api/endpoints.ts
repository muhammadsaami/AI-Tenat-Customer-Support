import {
  apiFetch,
  ApiError,
  isMockMode,
  getStoredTokens,
  refreshSession,
} from "./client";
import type {
  ChatResponse,
  ChatRequest,
  DocumentOut,
  HealthResponse,
  LogoutRequest,
  ReadinessResponse,
  RefreshRequest,
  TenantSignup,
  TokenResponse,
  UserLogin,
  UserOut,
} from "@/types/api";

class ApiNotWiredError extends Error {
  constructor(endpoint: string) {
    super(
      `The ${endpoint} endpoint is only available when VITE_USE_MOCK=false.`
    );
    this.name = "ApiNotWiredError";
  }
}

function ensureLive(endpoint: string) {
  if (isMockMode()) throw new ApiNotWiredError(endpoint);
}

export const authApi = {
  async login(data: UserLogin): Promise<TokenResponse> {
    ensureLive("auth/login");
    return apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: data,
    });
  },
  async register(data: TenantSignup): Promise<TokenResponse> {
    ensureLive("auth/signup");
    return apiFetch<TokenResponse>("/auth/signup", {
      method: "POST",
      body: data,
    });
  },
  async refresh(data: RefreshRequest): Promise<TokenResponse> {
    ensureLive("auth/refresh");
    return apiFetch<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: data,
    });
  },
  async logout(data: LogoutRequest): Promise<void> {
    ensureLive("auth/logout");
    return apiFetch<void>("/auth/logout", {
      method: "POST",
      body: data,
      token: getStoredTokens().access,
    });
  },
  async me(): Promise<UserOut> {
    ensureLive("auth/me");
    return apiFetch<UserOut>("/auth/me", {
      token: getStoredTokens().access,
    });
  },
};

export const chatApi = {
  async send(data: ChatRequest): Promise<ChatResponse> {
    ensureLive("chat/");
    return apiFetch<ChatResponse>("/chat/", {
      method: "POST",
      body: data,
      token: getStoredTokens().access,
    });
  },
};

export const documentsApi = {
  async list(): Promise<DocumentOut[]> {
    ensureLive("documents/");
    return apiFetch<DocumentOut[]>("/documents/", {
      token: getStoredTokens().access,
    });
  },
  async upload(file: File): Promise<DocumentOut> {
    ensureLive("documents/upload");
    const formData = new FormData();
    formData.append("file", file, file.name);
    return apiFetch<DocumentOut>("/documents/upload", {
      method: "POST",
      formData,
      token: getStoredTokens().access,
    });
  },
};

export const systemApi = {
  async health(): Promise<HealthResponse> {
    ensureLive("health");
    return apiFetch<HealthResponse>("/health");
  },
  async ready(): Promise<ReadinessResponse> {
    ensureLive("health/ready");
    return apiFetch<ReadinessResponse>("/health/ready");
  },
};

export { ApiError, isMockMode, getStoredTokens, refreshSession, apiFetch };