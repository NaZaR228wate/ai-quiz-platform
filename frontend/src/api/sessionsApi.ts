import { Attempt, CreateAttemptRequest } from "./attemptsApi";
import { apiClient } from "./client";

export type SessionStatus = "active" | "closed";

export type QuizSession = {
  id: number;
  quiz_id: number;
  teacher_id: number;
  code: string;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
};

export type SessionByCode = {
  id: number;
  quiz_id: number;
  code: string;
  status: SessionStatus;
  quiz: {
    id: number;
    title: string;
    description: string | null;
  };
};

export type SessionAttemptSummary = {
  id: number;
  quiz_id: number;
  session_id: number;
  student_id: number;
  student_name: string | null;
  student_email: string;
  score: number;
  total_questions: number;
  percent: number;
  created_at: string;
};

export type SessionAnalytics = {
  session_id: number;
  quiz_id: number;
  status: SessionStatus;
  students_count: number;
  finished_count: number;
  average_score: number;
  average_percent: number;
  total_questions: number;
  best_score: number;
  worst_score: number;
};

export type TeacherSessionSummary = {
  id: number;
  code: string;
  quiz_id: number;
  quiz_title: string;
  course_title: string | null;
  topic_title: string | null;
  status: SessionStatus;
  created_at: string;
  closed_at: string | null;
  attempts_count: number;
};

export const sessionsApi = {
  createSession: (quizId: string) => apiClient.post<QuizSession>(`/quizzes/${quizId}/sessions`),
  getMySessions: () => apiClient.get<TeacherSessionSummary[]>("/sessions/my"),
  getSession: (sessionId: string) => apiClient.get<QuizSession>(`/sessions/${sessionId}`),
  getSessionByCode: (code: string) => apiClient.get<SessionByCode>(`/sessions/code/${code}`),
  getSessionForTake: (sessionId: string) => apiClient.get<SessionByCode>(`/sessions/${sessionId}/take`),
  createSessionAttempt: (sessionId: string, data: CreateAttemptRequest) =>
    apiClient.post<Attempt>(`/sessions/${sessionId}/attempts`, data),
  getSessionAttempts: (sessionId: string) => apiClient.get<SessionAttemptSummary[]>(`/sessions/${sessionId}/attempts`),
  getSessionAnalytics: (sessionId: string) => apiClient.get<SessionAnalytics>(`/sessions/${sessionId}/analytics`),
  closeSession: (sessionId: string) => apiClient.post<QuizSession>(`/sessions/${sessionId}/close`),
  reopenSession: (sessionId: string) => apiClient.post<QuizSession>(`/sessions/${sessionId}/reopen`),
  deleteSession: (sessionId: string) => apiClient.delete(`/sessions/${sessionId}`),
};
