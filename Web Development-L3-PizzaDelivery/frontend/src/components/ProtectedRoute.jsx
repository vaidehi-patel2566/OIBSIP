import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="screen-loading">Heating the oven…</div>;
  if (!user) return <Navigate to="/" replace />;
  return <Outlet />;
}
