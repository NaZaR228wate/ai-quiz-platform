import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Layout } from "../components/Layout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AttemptResultPage } from "../pages/AttemptResultPage";
import { CourseDetailsPage } from "../pages/CourseDetailsPage";
import { CoursesPage } from "../pages/CoursesPage";
import { HomePage } from "../pages/HomePage";
import { JoinSessionPage } from "../pages/JoinSessionPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { QuizPage } from "../pages/QuizPage";
import { RegisterPage } from "../pages/RegisterPage";
import { SessionDashboardPage } from "../pages/SessionDashboardPage";
import { SessionTakePage } from "../pages/SessionTakePage";
import { StudentDashboardPage } from "../pages/StudentDashboardPage";
import { TeacherDashboardPage } from "../pages/TeacherDashboardPage";
import { TopicDetailsPage } from "../pages/TopicDetailsPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute>
                <TeacherDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join-session"
            element={
              <ProtectedRoute>
                <JoinSessionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:topicId"
            element={
              <ProtectedRoute>
                <TopicDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes/:quizId"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attempts/:attemptId"
            element={
              <ProtectedRoute>
                <AttemptResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/:sessionId"
            element={
              <ProtectedRoute>
                <SessionDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sessions/:sessionId/take"
            element={
              <ProtectedRoute>
                <SessionTakePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
