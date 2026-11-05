function appConfig() {
  const smtpReady = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, ""),
    jwtSecret: process.env.JWT_SECRET || "forno-dev-only-secret",
    smtpReady,
    razorpayReady: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    notifyEmail: process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "admin@forno.test"
  };
}

module.exports = { appConfig };
