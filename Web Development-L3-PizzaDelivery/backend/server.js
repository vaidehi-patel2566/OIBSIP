const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/config/db");
const { seed } = require("./src/seed/seed");
const { startJobs } = require("./src/jobs/scheduler");
const { appConfig } = require("./src/utils/config");
const authRoutes = require("./src/routes/auth");
const menuRoutes = require("./src/routes/menu");
const paymentRoutes = require("./src/routes/payment");
const orderRoutes = require("./src/routes/orders");
const adminRoutes = require("./src/routes/admin");

const app = express();
const config = appConfig();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

const dist = path.join(__dirname, "..", "frontend", "dist");
if (process.env.NODE_ENV === "production" && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.use((error, req, res, next) => {
  if (error.name === "CastError") {
    return res.status(400).json({ message: "That record could not be found" });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: "Some details are invalid" });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: "That record already exists" });
  }
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const message = status === 500 ? "Something went wrong" : error.message;
  res.status(status).json({ message });
});

async function start() {
  await connectDB();
  await seed();
  startJobs();
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    const ready = appConfig();
    console.log(`Forno API listening on http://localhost:${port}`);
    console.log(`Customer app expected at ${ready.clientUrl}`);
    console.log(`Razorpay: ${ready.razorpayReady ? "configured" : "not configured"}`);
    console.log(`SMTP: ${ready.smtpReady ? "configured" : "not configured"}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
