import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "../api";

export default function AdminRoute() {
  const [state, setState] = useState("loading");

  useEffect(() => {
    let active = true;
    api("/admin/me", { admin: true })
      .then(() => {
        if (active) setState("ready");
      })
      .catch(() => {
        if (active) setState("denied");
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <div className="screen-loading">Opening the kitchen desk…</div>;
  if (state === "denied") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
