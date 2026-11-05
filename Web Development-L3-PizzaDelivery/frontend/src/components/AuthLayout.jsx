export default function AuthLayout({ kicker, title, lede, variant, children }) {
  const admin = variant === "admin";
  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <p className="brand-mark">Forno</p>
        <div>
          <h1>{admin ? "The kitchen desk." : "Pizza, composed to order."}</h1>
          <p className="brand-copy">
            {admin
              ? "Stock, thresholds, and every ticket on the pass. This account is not created from customer signup."
              : "Choose a house pie or build one from the base up. Then follow it from the oven to the door."}
          </p>
        </div>
        <div className={`pie pie-${admin ? 2 : 1}`} aria-hidden="true">
          <span className="drop drop-a" />
          <span className="drop drop-b" />
          <span className="drop drop-c" />
          <span className="drop drop-d" />
          <span className="drop drop-e" />
          <span className="leaf" />
        </div>
      </section>
      <section className="auth-panel">
        <div className="form-card">
          <p className="kicker">{kicker}</p>
          <h2>{title}</h2>
          {lede ? <p className="lede">{lede}</p> : null}
          {children}
        </div>
      </section>
    </main>
  );
}
