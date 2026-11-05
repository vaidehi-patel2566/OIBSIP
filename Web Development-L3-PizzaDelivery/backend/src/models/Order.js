const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderNumber: { type: String, required: true, unique: true },
  kind: { type: String, enum: ["variety", "custom"], required: true },
  pizzaName: { type: String, required: true },
  description: { type: String, default: "" },
  base: { type: String, required: true },
  sauce: { type: String, required: true },
  cheese: { type: String, required: true },
  vegetables: [{ type: String }],
  quantity: { type: Number, required: true, min: 1 },
  amount: { type: Number, required: true, min: 0 },
  payment: {
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, required: true },
    razorpaySignature: { type: String, required: true },
    status: { type: String, default: "paid" }
  },
  status: {
    type: String,
    enum: ["Order Received", "In Kitchen", "Sent to Delivery"],
    default: "Order Received"
  }
}, { timestamps: true });

orderSchema.index({ "payment.razorpayOrderId": 1 }, { unique: true });

orderSchema.set("toJSON", {
  transform(doc, ret) {
    if (ret.payment) delete ret.payment.razorpaySignature;
    return ret;
  }
});

module.exports = mongoose.model("Order", orderSchema);
