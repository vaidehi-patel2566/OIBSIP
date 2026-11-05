const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ["base", "sauce", "cheese", "vegetable"],
    required: true
  },
  name: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, min: 0 },
  threshold: { type: Number, required: true, min: 1, default: 20 },
  price: { type: Number, required: true, min: 0 },
  position: { type: Number, default: 0 },
  alertActive: { type: Boolean, default: false }
}, { timestamps: true });

inventorySchema.index({ category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("InventoryItem", inventorySchema);
