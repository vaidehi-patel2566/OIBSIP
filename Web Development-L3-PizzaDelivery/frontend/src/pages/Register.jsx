import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Register() {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Create account · Forno";
  }, []);

  if (loading) return <div className="screen-loading">Heating the oven…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api("/auth/register", { method: "POST", body: { name, email, password } });
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout kicker="New here" title="Create your account" lede="We email a verification link before you can sign in.">
      {done ? (
        <div>
          <p className="banner banner-ok">{done.message}</p>
          {done.devLink ? (
            <p className="dev-link">
              Mail is not leaving this server yet. Open the verification link:
              <a href={done.devLink}>{done.devLink}</a>
            </p>
          ) : (
            <p className="lede">Check your inbox, then come back to sign in.</p>
          )}
          <Link to="/" className="button button-primary">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack-form">
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button-primary button-block" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}
      {done ? null : (
        <p className="form-links">
          <Link to="/">Already have an account</Link>
        </p>
      )}
    </AuthLayout>
  );
}
