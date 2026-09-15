export interface UserOut {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TenantSignup {
  tenant_name: string;
  admin_email: string;
  admin_password: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface DocumentOut {
  id: string;
  filename: string;
  status: "processing" | "ready" | "failed";
  chunk_count: number;
  created_at: string;
}

export interface ChatRequest {
  question: string;
}

export interface ChatSource {
  doc_id: string;
  filename: string;
  chunk_index: number;
  distance: number;
  preview: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
}

export interface HealthResponse {
  status: string;
  app: string;
}

export interface ReadinessResponse {
  status: string;
  checks: Record<string, string>;
}