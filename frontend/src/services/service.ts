import { isMockMode } from "./api/client";
import { authApi, chatApi, documentsApi, systemApi } from "./api/endpoints";
import { mockChatApi, mockDocumentsApi, mockSystemApi } from "./mock/service";

export const isDemo = (): boolean => isMockMode();

export const services = {
  documents: isMockMode() ? mockDocumentsApi : documentsApi,
  chat: isMockMode() ? mockChatApi : chatApi,
  system: isMockMode() ? mockSystemApi : systemApi,
  auth: authApi,
};