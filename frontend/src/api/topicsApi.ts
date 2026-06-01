import { apiClient } from "./client";

export type Topic = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export type TopicCreate = {
  title: string;
  description?: string;
};

export const topicsApi = {
  getTopicsByCourse: (courseId: string) => apiClient.get<Topic[]>(`/courses/${courseId}/topics`),
  createTopic: (courseId: string, data: TopicCreate) => apiClient.post<Topic>(`/courses/${courseId}/topics`, data),
  getTopic: (topicId: string) => apiClient.get<Topic>(`/topics/${topicId}`),
  deleteTopic: (topicId: string) => apiClient.delete(`/topics/${topicId}`),
};
