const express = require("express");
const Order = require("../models/Order");
const { asyncHandler } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/mine", requireAuth("user"), asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(50);
  res.json({ orders });
}));

module.exports = router;
