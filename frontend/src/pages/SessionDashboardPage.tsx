import { AxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { quizzesApi } from "../api/quizzesApi";
import {
  QuizSession,
  SessionAnalytics,
  SessionAttemptSummary,
  sessionsApi,
} from "../api/sessionsApi";

export function SessionDashboardPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [quizName, setQuizName] = useState("");
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [attempts, setAttempts] = useState<SessionAttemptSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const loadSessionDashboard = useCallback(
    async (showLoading: boolean) => {
      if (!sessionId) {
        setError("Session not found or access denied.");
        setIsLoading(false);
        return;
      }

      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const sessionResponse = await sessionsApi.getSession(sessionId);
        const [quizResponse, analyticsResponse, attemptsResponse] = await Promise.all([
          quizzesApi.getQuiz(String(sessionResponse.data.quiz_id)),
          sessionsApi.getSessionAnalytics(sessionId),
          sessionsApi.getSessionAttempts(sessionId),
        ]);
        setSession(sessionResponse.data);
        setQuizName(quizResponse.data.title);
        setAnalytics(analyticsResponse.data);
        setAttempts(attemptsResponse.data);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    loadSessionDashboard(true);
  }, [loadSessionDashboard]);

  useEffect(() => {
    if (session?.status !== "active") {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadSessionDashboard(false);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [loadSessionDashboard, session?.status]);

  async function handleCloseSession() {
    if (!sessionId || !window.confirm("Close this session?")) {
      return;
    }

    setIsClosing(true);
    setCloseError(null);

    try {
      const response = await sessionsApi.closeSession(sessionId);
      setSession(response.data);
      await loadSessionDashboard(false);
    } catch (caughtError) {
      setCloseError(getErrorMessage(caughtError));
    } finally {
      setIsClosing(false);
    }
  }

  async function handleReopenSession() {
    if (!sessionId || !window.confirm("Reopen this session?")) {
      return;
    }

    setIsReopening(true);
    setCloseError(null);

    try {
      const response = await sessionsApi.reopenSession(sessionId);
      setSession(response.data);
      await loadSessionDashboard(false);
    } catch (caughtError) {
      setCloseError(getErrorMessage(caughtError));
    } finally {
      setIsReopening(false);
    }
  }

  async function handleDeleteSession() {
    if (!sessionId || attempts.length > 0) {
      return;
    }

    setIsDeleting(true);
    setCloseError(null);

    try {
      await sessionsApi.deleteSession(sessionId);
      navigate("/teacher");
    } catch (caughtError) {
      setCloseError(getErrorMessage(caughtError));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCopyCode() {
    if (!session) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.code);
      setCopySuccess("Copied");
    } catch {
      setCopySuccess("Copy failed. Select and copy the code manually.");
    }
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Session Dashboard</h1>
        <p>Loading session...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Session Dashboard</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  const leaderboard = buildLeaderboard(attempts);

  return (
    <div className="dashboard-grid">
      <section className="page-card">
        <div className="session-dashboard-header">
          <div className="session-dashboard-header__code">
            <span className="helper-text">Live session code</span>
            <div className="session-dashboard-header__code-line">
              <strong className="session-code">{session?.code}</strong>
              {session ? <span className={`status-badge ${session.status}`}>{session.status}</span> : null}
            </div>
            <p>Share this code with students and monitor submissions.</p>
          </div>

          <div className="session-header-actions">
            {session ? (
              <Link className="secondary-link" to={`/quizzes/${session.quiz_id}`}>
                Back to quiz
              </Link>
            ) : null}
            <button type="button" className="secondary-button" onClick={handleCopyCode}>
              Copy code
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isRefreshing}
              onClick={() => loadSessionDashboard(false)}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            {session?.status === "active" ? (
              <button type="button" className="danger-button" disabled={isClosing} onClick={handleCloseSession}>
                {isClosing ? "Closing..." : "Close session"}
              </button>
            ) : null}
            {session?.status === "closed" ? (
              <button type="button" className="secondary-button" disabled={isReopening} onClick={handleReopenSession}>
                {isReopening ? "Reopening..." : "Reopen session"}
              </button>
            ) : null}
            <button type="button" className="danger-button" onClick={() => setIsDeleteConfirmOpen(true)}>
              Delete session
            </button>
          </div>
        </div>

        <dl className="profile-list">
          <div>
            <dt>Quiz Name</dt>
            <dd>{cleanDemoText(quizName || "Quiz")}</dd>
          </div>
          <div>
            <dt>Session Code</dt>
            <dd>{session?.code}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{session?.status === "active" ? "Active" : "Closed"}</dd>
          </div>
          <div>
            <dt>Students Joined</dt>
            <dd>{analytics?.students_count ?? 0}</dd>
          </div>
          <div>
            <dt>Attempts</dt>
            <dd>{analytics?.finished_count ?? 0}</dd>
          </div>
          <div>
            <dt>Average Score</dt>
            <dd>{analytics ? `${analytics.average_score} / ${analytics.total_questions}` : "0"}</dd>
          </div>
          <div>
            <dt>Completion Rate</dt>
            <dd>{analytics ? getCompletionRate(analytics) : 0}%</dd>
          </div>
          <div>
            <dt>Created at</dt>
            <dd>{session ? new Date(session.created_at).toLocaleString() : ""}</dd>
          </div>
          {session?.closed_at ? (
            <div>
              <dt>Closed at</dt>
              <dd>{new Date(session.closed_at).toLocaleString()}</dd>
            </div>
          ) : null}
        </dl>

        {copySuccess ? <div className="form-success">{copySuccess}</div> : null}
        {closeError ? <div className="form-error">{closeError}</div> : null}
      </section>

      <section className="page-card">
        <h2>Analytics</h2>
        {analytics ? (
          <dl className="analytics-grid">
            <div>
              <dt>Students</dt>
              <dd>{analytics.students_count}</dd>
            </div>
            <div>
              <dt>Finished</dt>
              <dd>{analytics.finished_count}</dd>
            </div>
            <div>
              <dt>Average score</dt>
              <dd>{analytics.average_score}</dd>
            </div>
            <div>
              <dt>Average percent</dt>
              <dd>{analytics.average_percent}%</dd>
            </div>
            <div>
              <dt>Total questions</dt>
              <dd>{analytics.total_questions}</dd>
            </div>
            <div>
              <dt>Best score</dt>
              <dd>{analytics.best_score}</dd>
            </div>
            <div>
              <dt>Worst score</dt>
              <dd>{analytics.worst_score}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <section className="page-card">
        <div className="item-header">
          <div>
            <h2>Live Leaderboard</h2>
            <p>Ranking updates automatically while the session is active.</p>
          </div>
          {session?.status === "active" ? <span className="status-badge active">Live</span> : null}
        </div>

        {leaderboard.length === 0 ? (
          <p className="empty-state">No leaderboard entries yet. Student results will appear after submission.</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((entry) => (
              <div key={entry.attempt.id} className={`leaderboard-row ${entry.rank <= 3 ? "leaderboard-row--top" : ""}`}>
                <div className="leaderboard-rank" aria-label={`Rank ${entry.rank}`}>
                  {getRankLabel(entry.rank)}
                </div>
                <div className="leaderboard-student">
                  <strong>{entry.attempt.student_name || "Unnamed student"}</strong>
                  <span>{entry.attempt.student_email}</span>
                </div>
                <div>
                  <span className="helper-text">Score</span>
                  <strong>{entry.attempt.percent}%</strong>
                </div>
                <div>
                  <span className="helper-text">Correct</span>
                  <strong>
                    {entry.attempt.score} / {entry.attempt.total_questions}
                  </strong>
                </div>
                <div>
                  <span className="helper-text">Completion time</span>
                  <strong>{new Date(entry.attempt.created_at).toLocaleTimeString()}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="page-card">
        <h2>Session attempts</h2>
        {attempts.length === 0 ? (
          <p className="empty-state">No students have submitted yet. Keep this page open during the session.</p>
        ) : (
          <div className="attempt-list">
            {attempts.map((attempt) => (
              <div key={attempt.id} className="attempt-row">
                <div>
                  <strong>{attempt.student_name || "Unnamed student"}</strong>
                  <p>{attempt.student_email}</p>
                </div>
                <div>
                  <span className="helper-text">Score</span>
                  <strong>
                    {attempt.score} / {attempt.total_questions}
                  </strong>
                </div>
                <div>
                  <span className="helper-text">Percent</span>
                  <strong>{attempt.percent}%</strong>
                </div>
                <div>
                  <span className="helper-text">Submitted</span>
                  <strong>{new Date(attempt.created_at).toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isDeleteConfirmOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="delete-session-title">
            <h2 id="delete-session-title">Delete session?</h2>
            <p>Deleting is only allowed when no students have submitted attempts.</p>
            {attempts.length > 0 ? (
              <div className="form-error">
                This session has student attempts. Deletion is blocked to preserve analytics and results.
              </div>
            ) : (
              <div className="form-warning">This session has no attempts and can be deleted safely.</div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="danger-button"
                disabled={attempts.length > 0 || isDeleting}
                onClick={handleDeleteSession}
              >
                {isDeleting ? "Deleting..." : "Delete Session"}
              </button>
              <button type="button" className="secondary-button" onClick={() => setIsDeleteConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getCompletionRate(analytics: SessionAnalytics): number {
  if (!analytics.students_count) {
    return 0;
  }

  return Math.round((analytics.finished_count / analytics.students_count) * 100);
}

type LeaderboardEntry = {
  rank: number;
  attempt: SessionAttemptSummary;
};

function buildLeaderboard(attempts: SessionAttemptSummary[]): LeaderboardEntry[] {
  return [...attempts]
    .sort((firstAttempt, secondAttempt) => {
      if (secondAttempt.percent !== firstAttempt.percent) {
        return secondAttempt.percent - firstAttempt.percent;
      }

      return new Date(firstAttempt.created_at).getTime() - new Date(secondAttempt.created_at).getTime();
    })
    .map((attempt, index) => ({
      rank: index + 1,
      attempt,
    }));
}

function getRankLabel(rank: number): string {
  if (rank === 1) {
    return "🥇";
  }
  if (rank === 2) {
    return "🥈";
  }
  if (rank === 3) {
    return "🥉";
  }

  return String(rank);
}

function cleanDemoText(value: string): string {
  const normalized = value.trim().toLowerCase();
  const replacements: Record<string, string> = {
    string: "Linear Equations",
    test: "Quadratic Equations",
    topic1: "Functions",
    topic2: "Geometry Basics",
    sample: "Graph Interpretation",
  };

  return replacements[normalized] ?? value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 403 || error.response?.status === 404) {
      return "Session not found or access denied.";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    return "Request failed. Please try again.";
  }

  return "Request failed. Please try again.";
}
