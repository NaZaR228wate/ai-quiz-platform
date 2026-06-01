import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { authApi } from "../api/authApi";
import { User } from "../auth/authTypes";
import { hasToken, removeToken } from "../auth/tokenStorage";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const authenticated = hasToken();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingUser, setIsCheckingUser] = useState(authenticated);

  useEffect(() => {
    let ignore = false;

    async function loadCurrentUser() {
      if (!hasToken()) {
        setCurrentUser(null);
        setIsCheckingUser(false);
        return;
      }

      setIsCheckingUser(true);
      try {
        const response = await authApi.getCurrentUser();
        if (!ignore) {
          setCurrentUser(response.data);
        }
      } catch {
        removeToken();
        if (!ignore) {
          setCurrentUser(null);
        }
      } finally {
        if (!ignore) {
          setIsCheckingUser(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, [location.pathname]);

  function handleLogout() {
    removeToken();
    setCurrentUser(null);
    navigate("/login");
  }

  const brandTarget =
    currentUser?.role === "teacher" ? "/teacher" : currentUser?.role === "student" ? "/student" : "/login";

  return (
    <header className="navbar">
      <Link className="brand" to={brandTarget}>
        AI Quiz Platform
      </Link>
      <nav className="nav-links" aria-label="Main navigation">
        {(!authenticated || !currentUser) && !isCheckingUser ? (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Login
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Register
            </NavLink>
          </>
        ) : null}
        {currentUser?.role === "teacher" ? (
          <NavLink to="/teacher" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Dashboard
          </NavLink>
        ) : null}
        {currentUser?.role === "student" ? (
          <>
            <NavLink to="/student" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Dashboard
            </NavLink>
            <NavLink
              to="/join-session"
              className={({ isActive }) => (isActive ? "nav-link nav-join-link active" : "nav-link nav-join-link")}
            >
              Join session
            </NavLink>
          </>
        ) : null}
      </nav>
      {currentUser ? (
        <button className="nav-button" type="button" onClick={handleLogout}>
          Logout
        </button>
      ) : null}
    </header>
  );
}
