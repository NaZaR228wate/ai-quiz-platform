import { apiClient } from "./client";

export type AttemptAnswerCreate = {
  question_id: number;
  selected_option_id: number;
};

export type CreateAttemptRequest = {
  answers: AttemptAnswerCreate[];
};

export type AttemptAnswer = {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_option_id: number;
  is_correct: boolean;
  correct_option_id: number | null;
};

export type Attempt = {
  id: number;
  quiz_id: number;
  student_id: number;
  score: number;
  total_questions: number;
  created_at: string;
  answers: AttemptAnswer[];
};

export const attemptsApi = {
  getAttempt: (attemptId: string) => apiClient.get<Attempt>(`/attempts/${attemptId}`),
  createAttempt: (quizId: string, data: CreateAttemptRequest) => apiClient.post<Attempt>(`/quizzes/${quizId}/attempts`, data),
};
