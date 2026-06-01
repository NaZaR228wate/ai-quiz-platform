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
  session_id?: number | null;
  student_id: number;
  score: number;
  total_questions: number;
  created_at: string;
  answers: AttemptAnswer[];
};

export type AttemptMistakeExplanation = {
  question_text: string;
  incorrect_answer: string;
  correct_answer: string;
  explanation: string;
};

export type AttemptExplanation = {
  attempt_id: number;
  explanations: AttemptMistakeExplanation[];
};

export type AttemptStudyPlan = {
  attempt_id: number;
  weak_topics: string[];
  what_to_study: string[];
  recommended_order: string[];
  practice_advice: string[];
};

export type WeakTopic = {
  topic_id: number;
  topic_title: string;
  average_score: number;
  attempts_count: number;
};

export const attemptsApi = {
  getAttempt: (attemptId: string) => apiClient.get<Attempt>(`/attempts/${attemptId}`),
  createAttempt: (quizId: string, data: CreateAttemptRequest) => apiClient.post<Attempt>(`/quizzes/${quizId}/attempts`, data),
  getAttemptExplanation: (attemptId: string) => apiClient.post<AttemptExplanation>(`/attempts/${attemptId}/explanation`),
  getAttemptStudyPlan: (attemptId: string) => apiClient.post<AttemptStudyPlan>(`/attempts/${attemptId}/study-plan`),
  getWeakTopics: () => apiClient.get<WeakTopic[]>("/analytics/weak-topics"),
};
