import { AxiosError } from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { Course, coursesApi } from "../api/coursesApi";
import { Quiz, quizzesApi } from "../api/quizzesApi";
import { SessionAnalytics, sessionsApi, TeacherSessionSummary } from "../api/sessionsApi";
import { topicsApi } from "../api/topicsApi";
import { User } from "../auth/authTypes";

type DashboardMetrics = {
  courses: number;
  quizzes: number;
  students: number;
  liveSessions: number;
  averageScore: number;
  aiGeneratedQuestions: number;
  finishedAttempts: number;
};

type DashboardData = {
  metrics: DashboardMetrics;
  recentQuizzes: Quiz[];
  sessionAnalytics: SessionAnalytics[];
};

export function TeacherDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<TeacherSessionSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    recentQuizzes: [],
    sessionAnalytics: [],
    metrics: {
      courses: 0,
      quizzes: 0,
      students: 0,
      liveSessions: 0,
      averageScore: 0,
      aiGeneratedQuestions: 0,
      finishedAttempts: 0,
    },
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingCourseId, setDeletingCourseId] = useState<number | null>(null);
  const [closingSessionId, setClosingSessionId] = useState<number | null>(null);
  const [reopeningSessionId, setReopeningSessionId] = useState<number | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [deleteConfirmSession, setDeleteConfirmSession] = useState<TeacherSessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const userResponse = await authApi.getCurrentUser();

        if (userResponse.data.role !== "teacher") {
          if (!ignore) {
            setUser(userResponse.data);
            setCourses([]);
          }
          return;
        }

        const [coursesResponse, sessionsResponse] = await Promise.all([coursesApi.getCourses(), sessionsApi.getMySessions()]);
        const dashboard = await loadDashboardData(coursesResponse.data, sessionsResponse.data);

        if (!ignore) {
          setUser(userResponse.data);
          setCourses(coursesResponse.data);
          setSessions(sortSessions(sessionsResponse.data));
          setDashboardData(dashboard);
        }
      } catch (caughtError) {
        if (!ignore) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await coursesApi.createCourse({
        title,
        description: description.trim() ? description : undefined,
      });
      setCourses((currentCourses) => [...currentCourses, response.data]);
      setDashboardData((currentData) => ({
        ...currentData,
        metrics: {
          ...currentData.metrics,
          courses: currentData.metrics.courses + 1,
        },
      }));
      setTitle("");
      setDescription("");
      setIsCreateOpen(false);
    } catch (caughtError) {
      setCreateError(getErrorMessage(caughtError));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteCourse(courseId: number) {
    if (!window.confirm("Delete this course? This action cannot be undone.")) {
      return;
    }

    setDeletingCourseId(courseId);
    setDeleteError(null);

    try {
      await coursesApi.deleteCourse(String(courseId));
      setCourses((currentCourses) => currentCourses.filter((course) => course.id !== courseId));
      setDashboardData((currentData) => ({
        ...currentData,
        metrics: {
          ...currentData.metrics,
          courses: Math.max(0, currentData.metrics.courses - 1),
        },
      }));
    } catch (caughtError) {
      setDeleteError(getErrorMessage(caughtError));
    } finally {
      setDeletingCourseId(null);
    }
  }

  async function handleCloseSession(sessionId: number) {
    if (!window.confirm("Close this session?")) {
      return;
    }

    setClosingSessionId(sessionId);
    setSessionError(null);

    try {
      const response = await sessionsApi.closeSession(String(sessionId));
      setSessions((currentSessions) =>
        sortSessions(
          currentSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  status: response.data.status,
                  closed_at: response.data.closed_at,
                }
              : session,
          ),
        ),
      );
      setDashboardData((currentData) => ({
        ...currentData,
        metrics: {
          ...currentData.metrics,
          liveSessions: Math.max(0, currentData.metrics.liveSessions - 1),
        },
      }));
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setClosingSessionId(null);
    }
  }

  async function handleReopenSession(sessionId: number) {
    setReopeningSessionId(sessionId);
    setSessionError(null);

    try {
      const response = await sessionsApi.reopenSession(String(sessionId));
      setSessions((currentSessions) =>
        sortSessions(
          currentSessions.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  status: response.data.status,
                  closed_at: response.data.closed_at,
                }
              : session,
          ),
        ),
      );
      setDashboardData((currentData) => ({
        ...currentData,
        metrics: {
          ...currentData.metrics,
          liveSessions: currentData.metrics.liveSessions + 1,
        },
      }));
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setReopeningSessionId(null);
    }
  }

  async function handleDeleteSession() {
    if (!deleteConfirmSession || deleteConfirmSession.attempts_count > 0) {
      return;
    }

    setDeletingSessionId(deleteConfirmSession.id);
    setSessionError(null);

    try {
      await sessionsApi.deleteSession(String(deleteConfirmSession.id));
      setSessions((currentSessions) => currentSessions.filter((session) => session.id !== deleteConfirmSession.id));
      setDashboardData((currentData) => ({
        ...currentData,
        metrics: {
          ...currentData.metrics,
          liveSessions: isSessionActive(deleteConfirmSession)
            ? Math.max(0, currentData.metrics.liveSessions - 1)
            : currentData.metrics.liveSessions,
        },
      }));
      setDeleteConfirmSession(null);
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setDeletingSessionId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Teacher Dashboard</h1>
        <p>Loading teacher dashboard...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Teacher Dashboard</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  if (user && user.role !== "teacher") {
    return <Navigate to="/student" replace />;
  }

  const activeSessions = sessions.filter(isSessionActive);
  const closedSessions = sessions.filter((session) => !isSessionActive(session));

  return (
    <div className="dashboard-grid">
      <div className="dashboard-grid-2">
        <section className="page-card">
          <h1>Teacher Dashboard</h1>
          <p>Create course content, generate quizzes and run live classroom sessions.</p>

          {user ? (
            <dl className="profile-list">
              <div>
                <dt>Full name</dt>
                <dd>{user.full_name || "Not provided"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{user.role}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="page-card demo-helper-card">
          <div>
            <span className="eyebrow">Quick start</span>
            <h2>Demo flow</h2>
          </div>
          <ol className="demo-flow-list">
            <li>Create a course</li>
            <li>Add a topic and material</li>
            <li>Generate an AI quiz</li>
            <li>Start a live session and share the code</li>
          </ol>
        </section>
      </div>

      <section className="overview-grid">
        <div className="overview-card">
          <span>Courses</span>
          <strong>{dashboardData.metrics.courses}</strong>
        </div>
        <div className="overview-card">
          <span>Quizzes</span>
          <strong>{dashboardData.metrics.quizzes}</strong>
        </div>
        <div className="overview-card">
          <span>Students</span>
          <strong>{dashboardData.metrics.students}</strong>
        </div>
        <div className="overview-card">
          <span>Live Sessions</span>
          <strong>{dashboardData.metrics.liveSessions}</strong>
        </div>
        <div className="overview-card">
          <span>Average Score</span>
          <strong>{dashboardData.metrics.averageScore}%</strong>
        </div>
      </section>

      <section className="dashboard-insights-layout">
        <div className="page-card dashboard-widget dashboard-widget--recent">
          <div>
            <h2>Recent Quizzes</h2>
            <p>Latest quizzes generated or created for your classes.</p>
          </div>
          {dashboardData.recentQuizzes.length === 0 ? (
            <p className="empty-state">No quizzes yet. Add material and generate your first AI quiz.</p>
          ) : (
            <ul className="compact-list">
              {dashboardData.recentQuizzes.slice(0, 5).map((quiz) => (
                <li key={quiz.id}>
                  <Link to={`/quizzes/${quiz.id}`}>{cleanDemoText(quiz.title)}</Link>
                  <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-stat-grid">
          <div className="page-card dashboard-widget dashboard-widget--stat">
            <h2>AI Generated Questions</h2>
            <p>Questions created from learning materials by AI quiz generation.</p>
            <strong className="widget-number">{dashboardData.metrics.aiGeneratedQuestions}</strong>
          </div>

          <div className="page-card dashboard-widget dashboard-widget--stat">
            <h2>Active Live Sessions</h2>
            <p>Sessions currently open for students.</p>
            <strong className="widget-number">{dashboardData.metrics.liveSessions}</strong>
          </div>

          <div className="page-card dashboard-widget dashboard-widget--stat">
            <h2>Quiz Performance</h2>
            <p>Average score across live session attempts.</p>
            <strong className="widget-number">{dashboardData.metrics.averageScore}%</strong>
          </div>

          <div className="page-card dashboard-widget dashboard-widget--stat">
            <h2>Student Results</h2>
            <p>Submitted attempts from live classroom sessions.</p>
            <strong className="widget-number">{dashboardData.metrics.finishedAttempts}</strong>
          </div>
        </div>
      </section>

      <section className="page-card sessions-panel-header">
        <h2>My Sessions</h2>
        <p>Manage active classroom sessions and review completed session analytics.</p>
      </section>

      <section className="page-card session-section session-section--active">
        <div className="item-header">
          <div>
            <h2>Active Sessions</h2>
            <p>Quickly return to sessions that are still open.</p>
          </div>
        </div>

        {sessionError ? <div className="form-error">{sessionError}</div> : null}

        {activeSessions.length === 0 ? (
          <p className="empty-state empty-state--compact">No active sessions right now. Start a live session from any quiz when students are ready.</p>
        ) : (
          <ul className="course-list session-list session-list--compact">
            {activeSessions.map((session) => (
              <li key={session.id} className="course-item session-list-item session-list-item--pinned">
                <div className="item-header">
                  <div>
                    <strong>{cleanDemoText(session.quiz_title)}</strong>
                    <p>Session code: {session.code}</p>
                  </div>
                  <div className="card-actions">
                    <span className={`status-badge ${session.status}`}>{formatSessionStatus(session.status)}</span>
                    <Link className="secondary-link" to={`/sessions/${session.id}`}>
                      Open Dashboard
                    </Link>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={closingSessionId === session.id}
                      onClick={() => handleCloseSession(session.id)}
                    >
                      {closingSessionId === session.id ? "Closing..." : "Close Session"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingSessionId === session.id}
                      onClick={() => setDeleteConfirmSession(session)}
                    >
                      {deletingSessionId === session.id ? "Deleting..." : "Delete Session"}
                    </button>
                  </div>
                </div>
                <dl className="session-summary-grid">
                  <div>
                    <dt>Attempts</dt>
                    <dd>{session.attempts_count}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(session.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page-card">
        <div className="item-header">
          <div>
            <h2>Session History</h2>
            <p>Review previous sessions and analytics.</p>
          </div>
        </div>

        {sessionError ? <div className="form-error">{sessionError}</div> : null}

        {closedSessions.length === 0 ? (
          <p className="empty-state">No session history yet. Closed sessions will appear here for review.</p>
        ) : (
          <ul className="course-list session-list">
            {closedSessions.map((session) => (
              <li key={session.id} className="course-item session-list-item">
                <div className="item-header">
                  <div>
                    <strong>{cleanDemoText(session.quiz_title)}</strong>
                    <p>
                      {cleanDemoText(session.course_title || "Course")} {session.topic_title ? `- ${cleanDemoText(session.topic_title)}` : ""}
                    </p>
                  </div>
                  <div className="card-actions">
                    <span className={`status-badge ${session.status}`}>{formatSessionStatus(session.status)}</span>
                    <Link className="secondary-link" to={`/sessions/${session.id}`}>
                      Open Dashboard
                    </Link>
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={reopeningSessionId === session.id}
                      onClick={() => handleReopenSession(session.id)}
                    >
                      {reopeningSessionId === session.id ? "Reopening..." : "Reopen Session"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingSessionId === session.id}
                      onClick={() => setDeleteConfirmSession(session)}
                    >
                      {deletingSessionId === session.id ? "Deleting..." : "Delete Session"}
                    </button>
                  </div>
                </div>
                <dl className="session-summary-grid">
                  <div>
                    <dt>Session Code</dt>
                    <dd>{session.code}</dd>
                  </div>
                  <div>
                    <dt>Attempts</dt>
                    <dd>{session.attempts_count}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(session.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>Closed</dt>
                    <dd>{session.closed_at ? new Date(session.closed_at).toLocaleString() : "Active"}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="page-card">
        <div className="item-header">
          <h2>Courses</h2>
          {!isCreateOpen ? (
            <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(true)}>
              + Create course
            </button>
          ) : null}
        </div>
        <p>Students can open quizzes by quiz ID.</p>

        {isCreateOpen ? (
          <form className="form-placeholder compact-form" onSubmit={handleCreateCourse}>
            <label>
              Title
              <input
                type="text"
                placeholder="Math Grade 10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>
            <label>
              Description
              <textarea
                placeholder="Algebra and geometry"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create course"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </button>
            </div>
            {createError ? <div className="form-error">{createError}</div> : null}
          </form>
        ) : null}

        {deleteError ? <div className="form-error">{deleteError}</div> : null}

        </section>

      <section className="page-card">
        {courses.length === 0 ? (
          <p className="empty-state">No courses yet. Create your first course to organize lessons, materials and quizzes.</p>
        ) : (
          <ul className="course-list">
            {courses.map((course) => (
              <li key={course.id} className="course-item">
                <div className="item-header">
                  <Link to={`/courses/${course.id}`}>{cleanDemoText(course.title)}</Link>
                  <div className="card-actions">
                    <Link className="secondary-link" to={`/courses/${course.id}`}>
                      Open
                    </Link>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={deletingCourseId === course.id}
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      {deletingCourseId === course.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                {course.description ? <p>{cleanDemoText(course.description)}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleteConfirmSession ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
            <h2 id="delete-session-title">Delete session?</h2>
            <p>
              This will remove the session from your dashboard. Attempts and analytics should be preserved for
              classroom records.
            </p>
            {deleteConfirmSession.attempts_count > 0 ? (
              <div className="form-error">
                This session has student attempts, so deletion is blocked. Close or reopen the session instead.
              </div>
            ) : (
              <div className="form-warning">This session has no attempts and can be deleted safely.</div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="danger-button"
                disabled={deleteConfirmSession.attempts_count > 0 || deletingSessionId === deleteConfirmSession.id}
                onClick={handleDeleteSession}
              >
                {deletingSessionId === deleteConfirmSession.id ? "Deleting..." : "Delete Session"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setDeleteConfirmSession(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function loadDashboardData(courses: Course[], sessions: TeacherSessionSummary[]): Promise<DashboardData> {
  const topicsByCourse = await Promise.all(
    courses.map(async (course) => {
      const response = await topicsApi.getTopicsByCourse(String(course.id));
      return response.data;
    }),
  );
  const topics = topicsByCourse.flat();

  const quizzesByTopic = await Promise.all(
    topics.map(async (topic) => {
      const response = await quizzesApi.getQuizzesByTopic(String(topic.id));
      return response.data;
    }),
  );
  const quizzes = quizzesByTopic.flat();

  const [questionGroups, sessionAnalytics] = await Promise.all([
    Promise.all(
      quizzes.map(async (quiz) => {
        const response = await quizzesApi.getQuizQuestions(String(quiz.id));
        return response.data;
      }),
    ),
    Promise.all(
      sessions.map(async (session) => {
        const response = await sessionsApi.getSessionAnalytics(String(session.id));
        return response.data;
      }),
    ),
  ]);

  const aiGeneratedQuizIds = new Set(
    quizzes.filter((quiz) => quiz.title.toLowerCase().includes("generated")).map((quiz) => quiz.id),
  );
  const activeSessions = sessions.filter((session) => session.status === "active").length;
  const finishedAttempts = sessionAnalytics.reduce((total, analytics) => total + analytics.finished_count, 0);
  const students = sessionAnalytics.reduce((total, analytics) => total + analytics.students_count, 0);
  const averageScore =
    sessionAnalytics.length > 0
      ? Math.round(
          sessionAnalytics.reduce((total, analytics) => total + analytics.average_percent, 0) /
            sessionAnalytics.length,
        )
      : 0;
  const aiGeneratedQuestions = questionGroups
    .flat()
    .filter((question) => aiGeneratedQuizIds.has(question.quiz_id)).length;

  return {
    recentQuizzes: [...quizzes].sort(
      (firstQuiz, secondQuiz) => new Date(secondQuiz.created_at).getTime() - new Date(firstQuiz.created_at).getTime(),
    ),
    sessionAnalytics,
    metrics: {
      courses: courses.length,
      quizzes: quizzes.length,
      students,
      liveSessions: activeSessions,
      averageScore,
      aiGeneratedQuestions,
      finishedAttempts,
    },
  };
}

function sortSessions(sessions: TeacherSessionSummary[]): TeacherSessionSummary[] {
  return [...sessions].sort((firstSession, secondSession) => {
    if (firstSession.status !== secondSession.status) {
      return firstSession.status === "active" ? -1 : 1;
    }

    return new Date(secondSession.created_at).getTime() - new Date(firstSession.created_at).getTime();
  });
}

function isSessionActive(session: TeacherSessionSummary & { is_active?: boolean }): boolean {
  if (typeof session.is_active === "boolean") {
    return session.is_active;
  }

  return session.status === "active";
}

function formatSessionStatus(status: TeacherSessionSummary["status"]): string {
  return status === "active" ? "Active" : "Closed";
}

function cleanDemoText(value: string): string {
  const normalized = value.trim().toLowerCase();
  const replacements: Record<string, string> = {
    string: "Linear Equations",
    test: "Quadratic Equations",
    topic1: "Functions",
    topic2: "Geometry Basics",
    sample: "Graph Interpretation",
    "basic linear equations": "Solving linear equations",
  };

  return replacements[normalized] ?? value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return "Please check the form fields.";
    }
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}

