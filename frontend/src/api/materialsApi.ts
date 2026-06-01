import { apiClient } from "./client";

export type Material = {
  id: number;
  topic_id: number;
  title: string;
  content_text: string;
  created_at: string;
};

export type MaterialCreate = {
  title: string;
  content_text: string;
};

export const materialsApi = {
  getMaterialsByTopic: (topicId: string) => apiClient.get<Material[]>(`/topics/${topicId}/materials`),
  createMaterial: (topicId: string, data: MaterialCreate) => apiClient.post<Material>(`/topics/${topicId}/materials`, data),
  getMaterial: (materialId: string) => apiClient.get<Material>(`/materials/${materialId}`),
  deleteMaterial: (materialId: string) => apiClient.delete(`/materials/${materialId}`),
};
