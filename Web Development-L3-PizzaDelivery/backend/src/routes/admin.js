const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const InventoryItem = require("../models/InventoryItem");
const Order = require("../models/Order");
const { fail, asyncHandler } = require("../utils/http");
const { appConfig } = require("../utils/config");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();
const STATUSES = ["Order Received", "In Kitchen", "Sent to Delivery"];
const rank = { base: 1, sauce: 2, cheese: 3, vegetable: 4 };

router.post("/login", asyncHandler(async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) throw fail(400, "Enter your email and password");
  const admin = await Admin.findOne({ email });
  if (!admin) throw fail(401, "Email or password is incorrect");
  const match = await bcrypt.compare(password, admin.password);
  if (!match) throw fail(401, "Email or password is incorrect");
  res.json({
    token: signToken({ id: admin._id.toString(), role: "admin" }),
    admin: { id: admin._id, name: admin.name, email: admin.email }
  });
}));

router.get("/me", requireAuth("admin"), asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.auth.id);
  if (!admin) throw fail(401, "Sign in required");
  const config = appConfig();
  res.json({
    admin: { id: admin._id, name: admin.name, email: admin.email },
    notifyEmail: config.notifyEmail,
    smtpReady: config.smtpReady
  });
}));

router.get("/inventory", requireAuth("admin"), asyncHandler(async (req, res) => {
  const items = await InventoryItem.find();
  items.sort((a, b) => rank[a.category] - rank[b.category] || a.position - b.position);
  res.json({ items });
}));

router.put("/inventory/:id", requireAuth("admin"), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Inventory item not found");
  const stock = Number(req.body?.stock);
  const threshold = Number(req.body?.threshold);
  if (!Number.isInteger(stock) || stock < 0) throw fail(400, "Stock must be a whole number of 0 or more");
  if (!Number.isInteger(threshold) || threshold < 1) throw fail(400, "Threshold must be a whole number of at least 1");
  const item = await InventoryItem.findById(req.params.id);
  if (!item) throw fail(404, "Inventory item not found");
  item.stock = stock;
  item.threshold = threshold;
  if (stock >= threshold) item.alertActive = false;
  await item.save();
  res.json({ item });
}));

router.get("/orders", requireAuth("admin"), asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(100).populate("user", "name email");
  res.json({ orders });
}));

router.put("/orders/:id/status", requireAuth("admin"), asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, "Order not found");
  if (!STATUSES.includes(req.body?.status)) throw fail(400, "Choose a valid order status");
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).populate("user", "name email");
  if (!order) throw fail(404, "Order not found");
  res.json({ order });
}));

module.exports = router;
