import { AxiosError } from "axios";
import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { setToken } from "../auth/tokenStorage";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successMessage = location.state && typeof location.state === "object" && "message" in location.state
    ? String(location.state.message)
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const loginResponse = await authApi.loginUser({ email, password });
      setToken(loginResponse.data.access_token);

      const meResponse = await authApi.getCurrentUser();
      if (meResponse.data.role === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="page-card auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Login</h1>
        <p>Log in with your teacher or student account.</p>
        {successMessage ? <div className="form-success">{successMessage}</div> : null}
        <form className="form-placeholder auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="12345678"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </button>
          {error ? <div className="form-error">{error}</div> : null}
        </form>
        <p className="form-footer">
          No account yet? <Link to="/register">Register</Link>
        </p>
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
    if (Array.isArray(detail)) {
      return "Please check the form fields.";
    }
    return "Login failed. Please try again.";
  }

  return "Login failed. Please try again.";
}
