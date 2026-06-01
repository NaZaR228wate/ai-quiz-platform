import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { hasToken, removeToken } from "../auth/tokenStorage";
import { User } from "../auth/authTypes";
import heroBg from "../assets/hero-bg.png";

export function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(hasToken());

  useEffect(() => {
    let ignore = false;

    async function checkCurrentUser() {
      if (!hasToken()) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await authApi.getCurrentUser();
        if (!ignore) {
          setCurrentUser(response.data);
        }
      } catch {
        removeToken();
      } finally {
        if (!ignore) {
          setIsCheckingAuth(false);
        }
      }
    }

    checkCurrentUser();

    return () => {
      ignore = true;
    };
  }, []);

  if (isCheckingAuth) {
    return (
      <section className="page-card">
        <h1>AI Quiz Platform</h1>
        <p>Loading...</p>
      </section>
    );
  }

  if (currentUser?.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }

  if (currentUser?.role === "student") {
    return <Navigate to="/student" replace />;
  }

  return (
    <section className="guest-hero" style={{ backgroundImage: `linear-gradient(rgba(5, 10, 28, 0.72), rgba(5, 10, 28, 0.82)), url(${heroBg})` }}>
      <div className="guest-hero__content">
        <span className="eyebrow">Classroom quiz MVP</span>
        <h1>AI Quiz Platform</h1>
        <p className="guest-hero__subtitle">
          Generate quizzes with AI, run live classroom sessions and track student results in real time.
        </p>
        <p className="guest-hero__description">
          Teachers can turn lesson materials into quizzes, launch live sessions and review student results. Students join
          with a session code and get instant feedback after submitting.
        </p>
      </div>

      <div className="benefit-grid feature-card-grid">
        <div className="benefit-card feature-card">
          <span className="feature-card__icon">🤖</span>
          <strong>AI Quiz Generation</strong>
          <p>Automatically create quizzes from learning materials.</p>
        </div>
        <div className="benefit-card feature-card">
          <span className="feature-card__icon">📊</span>
          <strong>Analytics</strong>
          <p>Track scores, attempts and classroom performance.</p>
        </div>
        <div className="benefit-card feature-card">
          <span className="feature-card__icon">🎓</span>
          <strong>Live Sessions</strong>
          <p>Share a session code and monitor students in real time.</p>
        </div>
      </div>

      <div className="guest-hero__cta-card">
        <div className="guest-hero__actions">
          <Link className="nav-button hero-button hero-button-primary" to="/login">
            Login
          </Link>
          <Link className="secondary-link hero-button hero-button-secondary" to="/register">
            Register
          </Link>
        </div>
      </div>
    </section>
  );
}
