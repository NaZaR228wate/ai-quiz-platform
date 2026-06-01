import { Outlet } from "react-router-dom";

import { ActiveSessionBar } from "./ActiveSessionBar";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <ActiveSessionBar />
      <main className="page-container">
        <Outlet />
      </main>
      <footer className="app-footer">AI Quiz Platform • Created by Nazar Hafynets • 2026</footer>
    </div>
  );
}
