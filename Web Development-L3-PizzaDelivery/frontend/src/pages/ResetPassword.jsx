import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Reset password · Forno";
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("Reset link is missing");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      const data = await api("/auth/reset-password", { method: "POST", body: { token, password } });
      setDone(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout kicker="Password" title="Choose a new password">
      {done ? (
        <div>
          <p className="banner banner-ok">{done}</p>
          <Link to="/" className="button button-primary">Sign in</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="stack-form">
          <label className="field">
            <span>New password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" minLength={8} required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button button-primary button-block" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
