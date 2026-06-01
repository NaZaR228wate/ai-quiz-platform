import { apiClient } from "./client";

export type GenerateQuizRequest = {
  questions_count: number;
};

export type GenerateQuizResponse = {
  quiz_id: number;
  material_id: number;
  title: string;
  questions_count: number;
};

export const aiApi = {
  generateQuizFromMaterial: (materialId: number, data: GenerateQuizRequest) =>
    apiClient.post<GenerateQuizResponse>(`/materials/${materialId}/generate-quiz`, data),
};
