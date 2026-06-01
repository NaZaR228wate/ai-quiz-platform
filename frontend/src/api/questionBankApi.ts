import { Quiz } from "./quizzesApi";
import { apiClient } from "./client";

export type QuestionBankQuestionType = "single_choice" | "multiple_choice";

export type QuestionBankOptionCreate = {
  option_text: string;
  is_correct: boolean;
};

export type QuestionBankOption = {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
};

export type QuestionBankQuestionCreate = {
  question_text: string;
  question_type: QuestionBankQuestionType;
  options: QuestionBankOptionCreate[];
};

export type QuestionBankQuestion = {
  id: number;
  teacher_id: number;
  question_text: string;
  question_type: QuestionBankQuestionType;
  created_at: string;
  options: QuestionBankOption[];
};

export type QuizFromQuestionBankCreate = {
  title: string;
  description?: string;
  question_ids: number[];
};

export const questionBankApi = {
  getQuestions: () => apiClient.get<QuestionBankQuestion[]>("/question-bank/questions"),
  createQuestion: (data: QuestionBankQuestionCreate) => apiClient.post<QuestionBankQuestion>("/question-bank/questions", data),
  updateQuestion: (questionId: string, data: QuestionBankQuestionCreate) =>
    apiClient.patch<QuestionBankQuestion>(`/question-bank/questions/${questionId}`, data),
  deleteQuestion: (questionId: string) => apiClient.delete(`/question-bank/questions/${questionId}`),
  createQuizFromQuestions: (topicId: string, data: QuizFromQuestionBankCreate) =>
    apiClient.post<Quiz>(`/topics/${topicId}/quizzes/from-question-bank`, data),
};
