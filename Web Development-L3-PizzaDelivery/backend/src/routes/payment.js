const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const PendingPayment = require("../models/PendingPayment");
const { fail, asyncHandler } = require("../utils/http");
const { appConfig } = require("../utils/config");
const { requireAuth } = require("../middleware/auth");
const { buildQuote, linesFromQuote } = require("../utils/orderQuote");
const { reserveLines, restoreLines } = require("../utils/stock");

const router = express.Router();

function signaturesMatch(expected, received) {
  const left = Buffer.from(String(expected));
  const right = Buffer.from(String(received));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function razorpayClient() {
  const config = appConfig();
  if (!config.razorpayReady) {
    throw fail(503, "Razorpay test keys are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

async function releaseOpenCheckouts(userId) {
  const leftover = await PendingPayment.find({ user: userId, consumed: false });
  for (const pending of leftover) {
    const removed = await PendingPayment.findOneAndDelete({ _id: pending._id, consumed: false });
    if (removed) await restoreLines(removed.lines);
  }
}

router.get("/config", requireAuth("user"), asyncHandler(async (req, res) => {
  const config = appConfig();
  res.json({
    enabled: config.razorpayReady,
    keyId: config.razorpayReady ? process.env.RAZORPAY_KEY_ID : ""
  });
}));

router.post("/quote", requireAuth("user"), asyncHandler(async (req, res) => {
  const quote = await buildQuote(req.body || {});
  res.json({ quote });
}));

router.post("/create", requireAuth("user"), asyncHandler(async (req, res) => {
  const razorpay = razorpayClient();
  const quote = await buildQuote(req.body || {});
  const lines = linesFromQuote(quote);
  await releaseOpenCheckouts(req.auth.id);
  await reserveLines(lines);
  let remote;
  try {
    remote = await razorpay.orders.create({
      amount: Math.round(quote.amount * 100),
      currency: "INR",
      receipt: `fn_${Date.now()}`.slice(0, 40)
    });
    await PendingPayment.create({
      user: req.auth.id,
      razorpayOrderId: remote.id,
      amount: quote.amount,
      quantity: quote.quantity,
      kind: quote.kind,
      pizzaName: quote.pizzaName,
      description: quote.description,
      base: quote.base,
      sauce: quote.sauce,
      cheese: quote.cheese,
      vegetables: quote.vegetables,
      lines,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });
  } catch (error) {
    await restoreLines(lines);
    throw fail(502, error?.error?.description || error.message || "Could not start Razorpay checkout");
  }
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    razorpayOrderId: remote.id,
    amount: remote.amount,
    currency: remote.currency,
    quote
  });
}));

router.post("/verify", requireAuth("user"), asyncHandler(async (req, res) => {
  const razorpayOrderId = String(req.body?.razorpayOrderId || "");
  const razorpayPaymentId = String(req.body?.razorpayPaymentId || "");
  const razorpaySignature = String(req.body?.razorpaySignature || "");
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw fail(400, "Payment confirmation is incomplete");
  }
  if (!appConfig().razorpayReady) throw fail(503, "Razorpay is not configured");

  const existing = await Order.findOne({ "payment.razorpayOrderId": razorpayOrderId, user: req.auth.id });
  if (existing) return res.json({ order: existing });

  const pending = await PendingPayment.findOneAndUpdate(
    {
      razorpayOrderId,
      user: req.auth.id,
      consumed: false,
      expiresAt: { $gt: new Date() }
    },
    { consumed: true },
    { new: true }
  );
  if (!pending) throw fail(400, "This checkout expired. Place the order again.");

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  if (!signaturesMatch(expected, razorpaySignature)) {
    await PendingPayment.updateOne({ _id: pending._id }, { consumed: false });
    throw fail(400, "Payment signature did not match");
  }

  try {
    const order = await Order.create({
      user: req.auth.id,
      orderNumber: `FN-${Date.now().toString().slice(-8)}`,
      kind: pending.kind,
      pizzaName: pending.pizzaName,
      description: pending.description,
      base: pending.base,
      sauce: pending.sauce,
      cheese: pending.cheese,
      vegetables: pending.vegetables,
      quantity: pending.quantity,
      amount: pending.amount,
      payment: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        status: "paid"
      },
      status: "Order Received"
    });
    await PendingPayment.deleteOne({ _id: pending._id });
    res.status(201).json({ order });
  } catch (error) {
    await PendingPayment.updateOne({ _id: pending._id }, { consumed: false });
    throw error;
  }
}));

router.post("/cancel", requireAuth("user"), asyncHandler(async (req, res) => {
  const razorpayOrderId = String(req.body?.razorpayOrderId || "");
  if (!razorpayOrderId) return res.json({ released: false });
  const pending = await PendingPayment.findOneAndDelete({
    razorpayOrderId,
    user: req.auth.id,
    consumed: false
  });
  if (pending) await restoreLines(pending.lines);
  res.json({ released: Boolean(pending) });
}));

module.exports = router;
