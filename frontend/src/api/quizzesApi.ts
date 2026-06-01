import { apiClient } from "./client";

export type Quiz = {
  id: number;
  topic_id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export type QuizOption = {
  id: number;
  question_id: number;
  option_text: string;
  is_correct?: boolean;
};

export type QuizQuestion = {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: string;
  created_at: string;
  options: QuizOption[];
};

export type QuizAnalytics = {
  quiz_id: number;
  attempts_count: number;
  average_score: number;
  average_percent: number;
  total_questions: number;
  best_score: number;
  worst_score: number;
};

export const quizzesApi = {
  getQuizzesByTopic: (topicId: string) => apiClient.get<Quiz[]>(`/topics/${topicId}/quizzes`),
  getQuiz: (quizId: string) => apiClient.get<Quiz>(`/quizzes/${quizId}`),
  getQuizQuestions: (quizId: string) => apiClient.get<QuizQuestion[]>(`/quizzes/${quizId}/questions`),
  getQuizAnalytics: (quizId: string) => apiClient.get<QuizAnalytics>(`/quizzes/${quizId}/analytics`),
  deleteQuiz: (quizId: string) => apiClient.delete(`/quizzes/${quizId}`),
};
