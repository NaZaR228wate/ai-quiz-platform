import { AxiosError } from "axios";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import type { UserRole } from "../auth/authTypes";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authApi.registerUser({
        email,
        password,
        full_name: fullName,
        role,
      });
      navigate("/login", { state: { message: "Account created. Please log in." } });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="page-card auth-card">
        <span className="eyebrow">Create account</span>
        <h1>Register</h1>
        <p>Create a teacher or student account.</p>
        <form className="form-placeholder auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              placeholder="Teacher One"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
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
              minLength={8}
              required
            />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="teacher">teacher</option>
              <option value="student">student</option>
            </select>
          </label>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </button>
          {error ? <div className="form-error">{error}</div> : null}
        </form>
        <p className="form-footer">
          Already have an account? <Link to="/login">Login</Link>
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
    return "Registration failed. Please try again.";
  }

  return "Registration failed. Please try again.";
}
