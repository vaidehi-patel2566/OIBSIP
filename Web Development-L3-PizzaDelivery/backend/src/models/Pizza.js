const mongoose = require("mongoose");

const pizzaSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  tag: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  base: { type: String, required: true },
  sauce: { type: String, required: true },
  cheese: { type: String, required: true },
  vegetables: [{ type: String }],
  position: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Pizza", pizzaSchema);
