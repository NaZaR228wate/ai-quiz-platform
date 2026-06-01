import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-card">
      <h1>Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/">Go home</Link>
    </section>
  );
}
