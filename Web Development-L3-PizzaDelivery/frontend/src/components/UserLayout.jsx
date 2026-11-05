import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  function onLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="user-shell">
      <header className="site-header">
        <div className="container header-row">
          <NavLink to="/dashboard" className="logo">Forno</NavLink>
          <nav className="nav-links">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>Menu</NavLink>
            <NavLink to="/build" className={({ isActive }) => isActive ? "active" : ""}>Build</NavLink>
          </nav>
          <div className="header-user">
            <span className="header-name">{user?.name}</span>
            <button type="button" className="link-button" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="container page page-stage" key={pathname}>
        <Outlet />
      </main>
    </div>
  );
}
