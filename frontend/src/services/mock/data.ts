import type { ChatSource, DocumentOut } from "@/types/api";

export const DEMO_BANNER = true;

let t = Date.now();
function iso(daysAgo: number, hoursAgo = 0) {
  return new Date(t - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();
}

export const docs: DocumentOut[] = [
  {
    id: "1d400e0f-bc61-4336-a27d-fdd228b225c3",
    filename: "Muhammad_Sami_Resume.pdf",
    status: "ready",
    chunk_count: 12,
    created_at: iso(0, 3),
  },
  {
    id: "2c5111f-cd72-4b47-b38e-0ee339c336d4",
    filename: "Onboarding_Handbook.md",
    status: "ready",
    chunk_count: 18,
    created_at: iso(1, 5),
  },
  {
    id: "3a6222g-de83-5c58-c49f-1ff449d447e5",
    filename: "Support_FAQ.pdf",
    status: "ready",
    chunk_count: 9,
    created_at: iso(2),
  },
  {
    id: "4b7333h-ef94-6d69-d50a-20055ae558f6",
    filename: "Product_Pricing_v2.pdf",
    status: "processing",
    chunk_count: 0,
    created_at: iso(0, 1),
  },
  {
    id: "5c8444i-f0a5-7e7a-e61b-31166bf66987",
    filename: "Quarterly_Review.txt",
    status: "failed",
    chunk_count: 0,
    created_at: iso(3, 2),
  },
];

export interface DemoSource extends ChatSource {}

export const demoSources: DemoSource[] = [
  {
    doc_id: "1d400e0f-bc61-4336-a27d-fdd228b225c3",
    filename: "Muhammad_Sami_Resume.pdf",
    chunk_index: 4,
    distance: 0.41,
    preview:
      "AI Backend Developer at HeyBobo.AI with 2+ years of experience building production-grade AI systems using Python, FastAPI, and large language models...",
  },
  {
    doc_id: "1d400e0f-bc61-4336-a27d-fdd228b225c3",
    filename: "Muhammad_Sami_Resume.pdf",
    chunk_index: 6,
    distance: 0.48,
    preview:
      "Designed an optimized RAG pipeline for document retrieval, improving answer precision by 35% compared to keyword-based search baselines...",
  },
  {
    doc_id: "2c5111f-cd72-4b47-b38e-0ee339c336d4",
    filename: "Onboarding_Handbook.md",
    chunk_index: 2,
    distance: 0.53,
    preview:
      "Engineering onboarding: standards for code review, testing expectations, and access to the production monitoring dashboards are covered in channels #eng-team and #incidents...",
  },
];

export interface DemoChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  quoted?: boolean;
  createdAt: string;
}

export function buildDemoAnswer(question: string): string {
  const q = question.trim().toLowerCase();
  if (q.includes("sami") || q.includes("resume") || q.includes("backend")) {
    return "Based on the indexed documents, Muhammad Sami is an AI Backend Developer at HeyBobo.AI with 2+ years of experience building production AI systems in Python and FastAPI. He designed an optimized RAG pipeline that improved answer precision by ~35% over keyword baselines, and he has hands-on experience with Supabase Edge Functions. This answer was produced from real document chunks; full context is in the Sources panel.";
  }
  if (q.includes("onboard") || q.includes("handbook") || q.includes("policy")) {
    return "Your onboarding handbook is indexed and searchable. It covers engineering standards for code review, testing expectations, and production monitoring, with team access managed through dedicated Slack channels. Ask for specifics (for example, code review expectations) to get a grounded citation.";
  }
  return "Here is a demo answer produced from example workspace data. In production, questions are answered strictly from chunks in your tenant's vector collection, and every answer is backed by the sources shown in the panel on the right. Connect the backend to see this flow live.";
}

export interface DemoChat {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export const chatSeeds: DemoChat[] = [
  { id: "ch1", title: "Muhammad Sami background", updatedAt: iso(0, 2), preview: buildDemoAnswer("What is Muhammad Sami's AI background?") },
  { id: "ch2", title: "Onboarding handbook overview", updatedAt: iso(1, 4), preview: "Your onboarding handbook is indexed and searchable..." },
  { id: "ch3", title: "Support FAQ coverage", updatedAt: iso(2, 6), preview: "Based on the indexed documents..." },
];

export interface ActivityItem {
  id: string;
  type: "upload" | "search" | "chat" | "user" | "system" | "index";
  title: string;
  description?: string;
  actor?: string;
  time: string;
}

export const activity: ActivityItem[] = [
  { id: "a1", type: "upload", title: "Document uploaded", description: "Product_Pricing_v2.pdf", actor: "Sara Ali", time: iso(0, 1) },
  { id: "a2", type: "chat", title: "Question answered", description: "Generated 3 grounded answers with sources", actor: "Omar Khan", time: iso(0, 2) },
  { id: "a3", type: "index", title: "Document indexed", description: "Onboarding_Handbook.md — 18 chunks stored", actor: "System", time: iso(1, 5) },
  { id: "a4", type: "search", title: "Tenant query executed", description: "Top-k retrieval across knowledge base", actor: "Omar Khan", time: iso(1, 7) },
  { id: "a5", type: "user", title: "Member invited", description: "invited a new support agent", actor: "Sara Ali", time: iso(2, 1) },
  { id: "a6", type: "system", title: "Vector store ready", description: "All collections healthy", actor: "System", time: iso(2, 4) },
];

export interface KnowledgeCollection {
  id: string;
  name: string;
  description: string;
  docCount: number;
  updatedAt: string;
  accent: string;
}

export const collections: KnowledgeCollection[] = [
  { id: "kb1", name: "Company & HR", description: "Handbooks, policies, and onboarding material", docCount: 14, updatedAt: iso(0, 3), accent: "#6366f1" },
  { id: "kb2", name: "Product & Pricing", description: "Features, plans, and release notes", docCount: 9, updatedAt: iso(1, 6), accent: "#8b5cf6" },
  { id: "kb3", name: "Support & FAQ", description: "Common customer questions and resolutions", docCount: 21, updatedAt: iso(2, 8), accent: "#0ea5e9" },
  { id: "kb4", name: "Engineering", description: "Runbooks, architecture docs, incidents", docCount: 26, updatedAt: iso(0, 5), accent: "#10b981" },
];

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

export const notifications: Notification[] = [
  { id: "n1", title: "Indexing complete", description: "Product_Pricing_v2.pdf finished processing", time: iso(0, 1), unread: true },
  { id: "n2", title: "Upload failed", description: "Quarterly_Review.txt could not be ingested", time: iso(0, 4), unread: true },
  { id: "n3", title: "New member joined", description: "Hira Shah accepted the invite", time: iso(1, 3), unread: false },
];

export const systemStatus = {
  postgres: "ok",
  chroma: "ok",
  redis: "not_configured",
  model: "idle",
} as const;

export function overviewStats() {
  const ready = docs.filter((d) => d.status === "ready").length;
  const processing = docs.filter((d) => d.status === "processing").length;
  const failed = docs.filter((d) => d.status === "failed").length;
  return {
    documents: docs.length,
    indexedDocuments: ready,
    totalChunks: docs.reduce((sum, d) => sum + d.chunk_count, 0),
    collections: collections.length,
    ready,
    processing,
    failed,
  };
}