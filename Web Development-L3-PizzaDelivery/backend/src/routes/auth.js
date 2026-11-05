const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { fail, asyncHandler } = require("../utils/http");
const { appConfig } = require("../utils/config");
const { sendMail, letter, escapeHtml } = require("../utils/email");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

function makeToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hash };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

function devLinkAllowed(result) {
  return process.env.NODE_ENV !== "production" && !result.delivered;
}

router.post("/register", asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (name.length < 2 || name.length > 60) throw fail(400, "Enter your name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Enter a valid email");
  if (password.length < 8 || password.length > 72) throw fail(400, "Password must be 8 to 72 characters");

  const existing = await User.findOne({ email });
  if (existing && existing.isVerified) throw fail(409, "An account with this email already exists");

  const { token, hash } = makeToken();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const passwordHash = await bcrypt.hash(password, 10);
  if (existing) {
    existing.name = name;
    existing.password = passwordHash;
    existing.verificationToken = hash;
    existing.verificationTokenExpiry = expiry;
    await existing.save();
  } else {
    await User.create({
      name,
      email,
      password: passwordHash,
      verificationToken: hash,
      verificationTokenExpiry: expiry
    });
  }

  const link = `${appConfig().clientUrl}/verify-email?token=${token}`;
  const result = await sendMail({
    to: email,
    subject: "Verify your Forno account",
    text: `Hi ${name}, verify your email: ${link}`,
    html: letter("Confirm your email", `Hi ${escapeHtml(name)}, confirm this address to start ordering.`, link, "Verify email")
  });

  const payload = {
    message: existing
      ? "This email is already registered but not verified. We sent a new verification link."
      : "Account created. Verify your email before signing in."
  };
  if (devLinkAllowed(result)) payload.devLink = link;
  res.status(existing ? 200 : 201).json(payload);
}));

router.get("/verify-email", asyncHandler(async (req, res) => {
  const token = String(req.query.token || "");
  if (!token) throw fail(400, "Verification link is missing");
  const user = await User.findOne({
    verificationToken: hashToken(token),
    verificationTokenExpiry: { $gt: new Date() }
  });
  if (!user) {
    throw fail(400, "This verification link is invalid or has expired. Register again with the same email to get a new link.");
  }
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiry = null;
  await user.save();
  res.json({ message: "Email verified. You can sign in." });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) throw fail(400, "Enter your email and password");
  const user = await User.findOne({ email });
  if (!user) throw fail(401, "Email or password is incorrect");
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw fail(401, "Email or password is incorrect");
  if (!user.isVerified) throw fail(403, "Verify your email before signing in");
  res.json({
    token: signToken({ id: user._id.toString(), role: "user" }),
    user: publicUser(user)
  });
}));

router.post("/forgot-password", asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const message = "If an account exists for that email, a reset link is on its way.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(400, "Enter a valid email");
  const user = await User.findOne({ email, isVerified: true });
  if (!user) return res.json({ message });

  const { token, hash } = makeToken();
  user.resetPasswordToken = hash;
  user.resetPasswordExpiry = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const link = `${appConfig().clientUrl}/reset-password?token=${token}`;
  const result = await sendMail({
    to: email,
    subject: "Reset your Forno password",
    text: `Reset your password: ${link}. This link expires in 30 minutes.`,
    html: letter("Reset your password", "This link expires in 30 minutes. If you did not ask for it, you can ignore this email.", link, "Choose a new password")
  });
  const payload = { message };
  if (devLinkAllowed(result)) payload.devLink = link;
  res.json(payload);
}));

router.post("/reset-password", asyncHandler(async (req, res) => {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  if (password.length < 8 || password.length > 72) throw fail(400, "Password must be 8 to 72 characters");
  const user = await User.findOne({
    resetPasswordToken: hashToken(token),
    resetPasswordExpiry: { $gt: new Date() }
  });
  if (!user) throw fail(400, "This reset link is invalid or has expired");
  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = null;
  user.resetPasswordExpiry = null;
  await user.save();
  res.json({ message: "Password updated. You can sign in." });
}));

router.get("/me", requireAuth("user"), asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.id);
  if (!user) throw fail(401, "Sign in required");
  res.json({ user: publicUser(user) });
}));

module.exports = router;
