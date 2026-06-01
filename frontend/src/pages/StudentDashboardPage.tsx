import { AxiosError } from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { sessionsApi } from "../api/sessionsApi";
import { User } from "../auth/authTypes";

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [quizId, setQuizId] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authApi.getCurrentUser();
        if (!ignore) {
          setCurrentUser(response.data);
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

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  function handleOpenQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuizId = quizId.trim();
    if (!trimmedQuizId) {
      setFormError("Please enter quiz ID.");
      return;
    }
    if (!/^\d+$/.test(trimmedQuizId)) {
      setFormError("Quiz ID must be a number.");
      return;
    }

    setFormError(null);
    navigate(`/quizzes/${trimmedQuizId}`);
  }

  async function handleJoinSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = sessionCode.trim().toUpperCase();
    if (!trimmedCode) {
      setSessionError("Please enter session code.");
      return;
    }

    setIsJoiningSession(true);
    setSessionError(null);

    try {
      const response = await sessionsApi.getSessionByCode(trimmedCode);
      navigate(`/sessions/${response.data.id}/take`, { state: { session: response.data } });
    } catch (caughtError) {
      setSessionError(getErrorMessage(caughtError));
    } finally {
      setIsJoiningSession(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Student Dashboard</h1>
        <p>Loading student dashboard...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Student Dashboard</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <div className="dashboard-grid-2">
        <section className="page-card">
          <h1>Student Dashboard</h1>
          <p>Join a live session or open a quiz using the ID your teacher shared.</p>

          <dl className="profile-list">
            <div>
              <dt>Full name</dt>
              <dd>{currentUser?.full_name || "Not provided"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{currentUser?.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{currentUser?.role}</dd>
            </div>
          </dl>
        </section>

        <section className="page-card demo-helper-card">
          <div>
            <span className="eyebrow">Student flow</span>
            <h2>How to complete a live quiz</h2>
          </div>
          <ol className="demo-flow-list">
            <li>Enter session code from teacher</li>
            <li>Answer questions</li>
            <li>Submit quiz</li>
            <li>View result</li>
          </ol>
        </section>
      </div>

      <div className="dashboard-grid-2">
        <section className="page-card">
          <h2>Join live session</h2>
          <p>Ask your teacher for the session code.</p>

          <form className="form-placeholder" onSubmit={handleJoinSession}>
            <label>
              Session code
              <input
                type="text"
                value={sessionCode}
                onChange={(event) => {
                  setSessionCode(event.target.value.toUpperCase());
                  setSessionError(null);
                }}
                placeholder="Example: A7K9Q2"
              />
            </label>
            <button type="submit" disabled={isJoiningSession}>
              {isJoiningSession ? "Joining..." : "Join session"}
            </button>
            {sessionError ? <div className="form-error">{sessionError}</div> : null}
          </form>
        </section>

        <section className="page-card">
          <h2>Open quiz by ID</h2>
          <p>Ask your teacher for the quiz ID or quiz link.</p>
          <p className="helper-text">Example link: /quizzes/4</p>

          <form className="form-placeholder" onSubmit={handleOpenQuiz}>
            <label>
              Quiz ID
              <input
                inputMode="numeric"
                type="text"
                value={quizId}
                onChange={(event) => {
                  setQuizId(event.target.value);
                  setFormError(null);
                }}
                placeholder="Example: 4"
              />
            </label>
            <button type="submit">Open quiz</button>
            {formError ? <div className="form-error">{formError}</div> : null}
          </form>
        </section>
      </div>

      <section className="page-card">
        <h2>How it works</h2>
        <ol className="steps-list">
          <li>Get quiz ID from your teacher</li>
          <li>Open quiz</li>
          <li>Answer all questions</li>
          <li>Submit and see your result</li>
        </ol>
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") {
      return detail;
    }
    return "Could not load student dashboard.";
  }

  return "Could not load student dashboard.";
}
