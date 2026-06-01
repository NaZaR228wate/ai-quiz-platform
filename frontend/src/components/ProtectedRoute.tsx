import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { authApi } from "../api/authApi";
import { hasToken, removeToken } from "../auth/tokenStorage";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(hasToken());
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function verifyToken() {
      if (!hasToken()) {
        setIsAllowed(false);
        setIsChecking(false);
        return;
      }

      try {
        await authApi.getCurrentUser();
        if (!ignore) {
          setIsAllowed(true);
        }
      } catch {
        removeToken();
        if (!ignore) {
          setIsAllowed(false);
        }
      } finally {
        if (!ignore) {
          setIsChecking(false);
        }
      }
    }

    verifyToken();

    return () => {
      ignore = true;
    };
  }, []);

  if (!hasToken()) {
    return <Navigate to="/login" replace />;
  }

  if (isChecking) {
    return (
      <section className="page-card">
        <h1>Loading</h1>
        <p>Checking your session...</p>
      </section>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
