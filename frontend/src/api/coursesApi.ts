import { apiClient } from "./client";

export type Course = {
  id: number;
  teacher_id: number;
  title: string;
  description: string | null;
  created_at: string;
};

export type CourseCreate = {
  title: string;
  description?: string;
};

export const coursesApi = {
  getCourses: () => apiClient.get<Course[]>("/courses"),
  getCourse: (courseId: string) => apiClient.get<Course>(`/courses/${courseId}`),
  createCourse: (data: CourseCreate) => apiClient.post<Course>("/courses", data),
  deleteCourse: (courseId: string) => apiClient.delete(`/courses/${courseId}`),
};
