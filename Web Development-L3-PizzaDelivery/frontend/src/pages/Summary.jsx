import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { rupees } from "../format";
import { openRazorpay } from "../razorpay";
import { clearOrderSession, readDraft, saveDraft } from "../storage";

export default function Summary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => readDraft());
  const [quote, setQuote] = useState(null);
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    document.title = "Order summary · Forno";
  }, []);

  useEffect(() => {
    api("/payment/config")
      .then((data) => setPayments(data))
      .catch(() => setPayments({ enabled: false }));
  }, []);

  const draftKey = JSON.stringify(draft);

  useEffect(() => {
    if (!draft) return undefined;
    let active = true;
    setQuoting(true);
    api("/payment/quote", { method: "POST", body: draft })
      .then((data) => {
        if (!active) return;
        setQuote(data.quote);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setQuote(null);
        setError(err.message);
      })
      .finally(() => {
        if (active) setQuoting(false);
      });
    return () => {
      active = false;
    };
  }, [draftKey]);

  function setQuantity(quantity) {
    const next = { ...draft, quantity };
    setDraft(next);
    saveDraft(next);
  }

  async function pay() {
    if (!draft || !quote) return;
    setError("");
    if (!payments?.enabled) {
      setError("Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env and restart the API.");
      return;
    }
    setPaying(true);
    let created = null;
    let paid = false;
    try {
      created = await api("/payment/create", { method: "POST", body: draft });
      const response = await openRazorpay({
        keyId: created.keyId,
        orderId: created.razorpayOrderId,
        amount: created.amount,
        name: user?.name || "",
        email: user?.email || "",
        description: created.quote?.pizzaName || quote.pizzaName
      });
      paid = true;
      const result = await api("/payment/verify", {
        method: "POST",
        body: {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature
        }
      });
      clearOrderSession();
      navigate("/dashboard", { state: { placed: result.order.orderNumber } });
    } catch (err) {
      if (created?.razorpayOrderId && !paid) {
        await api("/payment/cancel", {
          method: "POST",
          body: { razorpayOrderId: created.razorpayOrderId }
        }).catch(() => {});
      }
      setError(err.message);
    } finally {
      setPaying(false);
    }
  }

  if (!draft) {
    return (
      <section>
        <h1>No pizza on the ticket.</h1>
        <Link to="/dashboard" className="button button-primary">Back to the menu</Link>
      </section>
    );
  }

  return (
    <div className="summary-layout">
      <section>
        <p className="kicker">Before payment</p>
        <h1>Order summary</h1>
        <p className="lede">Check the pie, then pay in Razorpay test mode. Success confirms the order.</p>
        <Link to={draft.kind === "custom" ? "/build" : "/dashboard"} className="text-link">Edit this pizza</Link>
      </section>
      <aside className="ticket">
        <p className="kicker">Kitchen ticket</p>
        <h2>{quote?.pizzaName || "Your pizza"}</h2>
        <p className="ingredients">{quote?.description}</p>
        {quote ? (
          <p className="ingredients">
            {quote.base} · {quote.sauce} · {quote.cheese}
            {quote.vegetables?.length ? ` · ${quote.vegetables.join(", ")}` : ""}
          </p>
        ) : null}
        <div className="qty-row">
          <span>Quantity</span>
          <div className="qty">
            <button type="button" onClick={() => setQuantity(Math.max(1, draft.quantity - 1))} disabled={draft.quantity <= 1 || paying}>−</button>
            <strong>{draft.quantity}</strong>
            <button type="button" onClick={() => setQuantity(Math.min(5, draft.quantity + 1))} disabled={draft.quantity >= 5 || paying}>+</button>
          </div>
        </div>
        {quoting ? <p className="lede">Checking the pass…</p> : null}
        {quote ? (
          <ul className="ticket-lines">
            {quote.breakdown.map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <span>{rupees(line.unitPrice)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="ticket-total">
          <span>Total · × {quote?.quantity || draft.quantity}</span>
          <strong>{quote ? rupees(quote.amount) : "—"}</strong>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {payments && !payments.enabled ? (
          <p className="banner banner-warn">Add Razorpay test keys in backend/.env to open checkout.</p>
        ) : (
          <p className="fine">Test mode. In the Razorpay window, choose Success to confirm.</p>
        )}
        <button type="button" className="button button-primary button-block" onClick={pay} disabled={!quote || paying || quoting}>
          {paying ? "Waiting for Razorpay…" : "Pay with Razorpay"}
        </button>
      </aside>
    </div>
  );
}
