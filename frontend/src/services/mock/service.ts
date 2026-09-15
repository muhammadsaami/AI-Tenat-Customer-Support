import { docs, demoSources, buildDemoAnswer, systemStatus } from "./data";
import type { ChatRequest, ChatResponse, DocumentOut } from "@/types/api";
import { uid } from "@/lib/util";

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const mockDocumentsApi = {
  async list(): Promise<DocumentOut[]> {
    await wait(240);
    return [...docs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
  async upload(file: File): Promise<DocumentOut> {
    await wait(1200);
    const doc: DocumentOut = {
      id: uid("doc"),
      filename: file.name,
      status: "ready",
      chunk_count: 1 + Math.floor(file.size / 1200),
      created_at: new Date().toISOString(),
    };
    docs.unshift(doc);
    return doc;
  },
};

export const mockChatApi = {
  async send(req: ChatRequest): Promise<ChatResponse> {
    await wait(900);
    return {
      answer: buildDemoAnswer(req.question),
      sources: demoSources,
    };
  },
};

export const mockSystemApi = {
  async health() {
    await wait(160);
    return { status: "ok", app: "SupportPilot" };
  },
  async ready() {
    await wait(200);
    return { status: "ok", checks: { ...systemStatus, model: "idle" } };
  },
};