const mongoose = require("mongoose");

const lineSchema = new mongoose.Schema({
  category: { type: String, required: true },
  name: { type: String, required: true },
  qty: { type: Number, required: true }
}, { _id: false });

const pendingPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  quantity: { type: Number, required: true },
  kind: { type: String, required: true },
  pizzaName: { type: String, required: true },
  description: { type: String, default: "" },
  base: { type: String, required: true },
  sauce: { type: String, required: true },
  cheese: { type: String, required: true },
  vegetables: [{ type: String }],
  lines: [lineSchema],
  consumed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model("PendingPayment", pendingPaymentSchema);
