import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { authApi } from "../api/authApi";
import { User } from "../auth/authTypes";
import { removeToken } from "../auth/tokenStorage";

export function CoursesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldLogin, setShouldLogin] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      try {
        const response = await authApi.getCurrentUser();
        if (!ignore) {
          setCurrentUser(response.data);
        }
      } catch {
        removeToken();
        if (!ignore) {
          setShouldLogin(true);
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

  if (isLoading) {
    return (
      <section className="page-card">
        <h1>Loading</h1>
        <p>Redirecting...</p>
      </section>
    );
  }

  if (shouldLogin || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }

  return <Navigate to="/student" replace />;
}
