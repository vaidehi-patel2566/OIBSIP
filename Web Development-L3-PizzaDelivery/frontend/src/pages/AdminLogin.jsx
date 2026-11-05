import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { ADMIN_TOKEN, api } from "../api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Kitchen sign in · Forno";
    api("/admin/me", { admin: true })
      .then(() => navigate("/admin"))
      .catch(() => {});
  }, [navigate]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api("/admin/login", { method: "POST", body: { email, password } });
      localStorage.setItem(ADMIN_TOKEN, data.token);
      navigate("/admin");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout variant="admin" kicker="Staff only" title="Kitchen sign in" lede="Customers cannot reach this account from registration.">
      <form onSubmit={onSubmit} className="stack-form">
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button button-primary button-block" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Open the desk"}
        </button>
      </form>
    </AuthLayout>
  );
}
