import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Sign in · Forno";
  }, []);

  if (loading) return <div className="screen-loading">Heating the oven…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout kicker="Welcome back" title="Sign in to order">
      <form onSubmit={onSubmit} className="stack-form">
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button-primary button-block" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="form-links">
        <Link to="/forgot-password">Forgot password</Link>
        <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
