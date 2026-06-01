import { AxiosError } from "axios";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { sessionsApi } from "../api/sessionsApi";
import { User } from "../auth/authTypes";

export function JoinSessionPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionCode, setSessionCode] = useState("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      setIsLoadingUser(true);
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
          setIsLoadingUser(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleJoinSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = sessionCode.trim().toUpperCase();
    if (!trimmedCode) {
      setFormError("Please enter session code.");
      return;
    }

    setIsJoining(true);
    setFormError(null);

    try {
      const response = await sessionsApi.getSessionByCode(trimmedCode);
      if (response.data.status === "closed") {
        setFormError("This session is closed. Ask your teacher for a new code.");
        return;
      }

      navigate(`/sessions/${response.data.id}/take`, { state: { session: response.data } });
    } catch (caughtError) {
      setFormError(getErrorMessage(caughtError));
    } finally {
      setIsJoining(false);
    }
  }

  if (isLoadingUser) {
    return (
      <section className="page-card">
        <h1>Join live session</h1>
        <p>Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-card">
        <h1>Join live session</h1>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  if (currentUser?.role === "teacher") {
    return (
      <section className="page-card empty-session-state">
        <span className="eyebrow">Teacher account</span>
        <h1>Only students can join sessions.</h1>
        <p>Teachers can start and monitor live sessions from quiz pages.</p>
        <Link className="secondary-link" to="/teacher">
          Go to dashboard
        </Link>
      </section>
    );
  }

  return (
    <div className="auth-page">
      <section className="page-card auth-card join-session-card">
        <span className="eyebrow">Live classroom</span>
        <h1>Join live session</h1>
        <p>Enter the code your teacher shared.</p>

        <form className="form-placeholder auth-form" onSubmit={handleJoinSession}>
          <label>
            Session code
            <input
              type="text"
              value={sessionCode}
              onChange={(event) => {
                setSessionCode(event.target.value.toUpperCase());
                setFormError(null);
              }}
              placeholder="Example: A7K9Q2"
            />
          </label>
          <button type="submit" disabled={isJoining}>
            {isJoining ? "Joining..." : "Join session"}
          </button>
          {formError ? <div className="form-error">{formError}</div> : null}
        </form>
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return "Session not found. Check the code and try again.";
    }

    const detail = error.response?.data?.detail;
    if (detail === "Session is closed") {
      return "This session is closed. Ask your teacher for a new code.";
    }
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      return "Please check the session code.";
    }
    return "Could not join session. Please try again.";
  }

  return "Could not join session. Please try again.";
}
