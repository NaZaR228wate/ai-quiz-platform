import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { authApi } from "../api/authApi";
import { sessionsApi, SESSIONS_CHANGED_EVENT, TeacherSessionSummary } from "../api/sessionsApi";
import { hasToken, removeToken } from "../auth/tokenStorage";

type ActiveSessionState = {
  session: TeacherSessionSummary;
  participants: number;
};

export function ActiveSessionBar() {
  const location = useLocation();
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  const loadActiveSession = useCallback(async () => {
    if (!hasToken()) {
      setActiveSession(null);
      return;
    }

    try {
      const userResponse = await authApi.getCurrentUser();
      if (userResponse.data.role !== "teacher") {
        setActiveSession(null);
        return;
      }

      const sessionsResponse = await sessionsApi.getMySessions();
      const latestActiveSession = sessionsResponse.data
        .filter(isSessionActive)
        .sort(
          (firstSession, secondSession) =>
            new Date(secondSession.created_at).getTime() - new Date(firstSession.created_at).getTime(),
        )[0];

      if (!latestActiveSession) {
        setActiveSession(null);
        return;
      }

      try {
        const analyticsResponse = await sessionsApi.getSessionAnalytics(String(latestActiveSession.id));
        setActiveSession({
          session: latestActiveSession,
          participants: analyticsResponse.data.students_count,
        });
      } catch {
        setActiveSession({
          session: latestActiveSession,
          participants: latestActiveSession.attempts_count,
        });
      }
    } catch {
      removeToken();
      setActiveSession(null);
    }
  }, []);

  useEffect(() => {
    loadActiveSession();
  }, [loadActiveSession, location.pathname]);

  useEffect(() => {
    window.addEventListener(SESSIONS_CHANGED_EVENT, loadActiveSession);
    return () => window.removeEventListener(SESSIONS_CHANGED_EVENT, loadActiveSession);
  }, [loadActiveSession]);

  async function handleCopyCode() {
    if (!activeSession) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeSession.session.code);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("Copy failed");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  }

  if (!activeSession) {
    return null;
  }

  return (
    <div className="active-session-bar" aria-label="Active live session">
      <div className="active-session-bar__content">
        <span className="helper-text">Active session</span>
        <strong>{activeSession.session.quiz_title}</strong>
        <span className="active-session-bar__code">{activeSession.session.code}</span>
        <span className="active-session-bar__meta">Participants: {activeSession.participants}</span>
        <span className="status-badge active">Active</span>
        {copyStatus ? <span className="copied-text">{copyStatus}</span> : null}
      </div>
      <div className="active-session-bar__actions">
        <Link className="secondary-link" to={`/sessions/${activeSession.session.id}`}>
          Open Dashboard
        </Link>
        <button className="secondary-button" type="button" onClick={handleCopyCode}>
          Copy Code
        </button>
      </div>
    </div>
  );
}

function isSessionActive(session: TeacherSessionSummary & { is_active?: boolean }): boolean {
  if (typeof session.is_active === "boolean") {
    return session.is_active;
  }

  return session.status === "active";
}
