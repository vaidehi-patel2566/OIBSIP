import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../api";
import { useAuth } from "../auth";

export default function ForgotPassword() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Forgot password · Forno";
  }, []);

  if (loading) return <div className="screen-loading">Heating the oven…</div>;
  if (user) return <Navigate to="/dashboard" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api("/auth/forgot-password", { method: "POST", body: { email } });
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout kicker="Password" title="Reset by email" lede="We will send a link if that address has a verified account.">
      {done ? (
        <div>
          <p className="banner banner-ok">{done.message}</p>
          {done.devLink ? (
            <p className="dev-link">
              Mail is not leaving this server yet. Open the reset link:
              <a href={done.devLink}>{done.devLink}</a>
            </p>
          ) : null}
          <Link to="/" className="button button-primary">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack-form">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button-primary button-block" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      {done ? null : (
        <p className="form-links">
          <Link to="/">Back to sign in</Link>
        </p>
      )}
    </AuthLayout>
  );
}
