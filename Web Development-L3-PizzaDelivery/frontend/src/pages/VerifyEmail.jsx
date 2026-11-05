import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { api } from "../api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [message, setMessage] = useState("Checking your link…");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    document.title = "Verify email · Forno";
  }, []);

  useEffect(() => {
    if (!token) {
      setMessage("Verification link is missing.");
      return undefined;
    }
    let active = true;
    api(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (!active) return;
        setOk(true);
        setMessage(data.message);
      })
      .catch((err) => {
        if (!active) return;
        setOk(false);
        setMessage(err.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <AuthLayout kicker="Email" title="Verify your address">
      <p className={ok ? "banner banner-ok" : "lede"}>{message}</p>
      <Link to="/" className="button button-primary">Go to sign in</Link>
    </AuthLayout>
  );
}
