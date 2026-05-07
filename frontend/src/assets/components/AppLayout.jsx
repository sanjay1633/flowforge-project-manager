import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function AppLayout({ title, actions, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to={user?.role === "admin" ? "/admin-dashboard" : "/member-dashboard"}>
          FlowForge
        </Link>
        <nav>
          <NavLink to={user?.role === "admin" ? "/admin-dashboard" : "/member-dashboard"}>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{user?.role || "member"}</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            {actions}
            <span className="user-chip">{user?.name}</span>
            <button className="button secondary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
