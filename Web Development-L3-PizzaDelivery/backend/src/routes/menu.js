const express = require("express");
const InventoryItem = require("../models/InventoryItem");
const Pizza = require("../models/Pizza");
const { asyncHandler } = require("../utils/http");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function availability(pizza, items) {
  const checks = [
    ["base", pizza.base],
    ["sauce", pizza.sauce],
    ["cheese", pizza.cheese],
    ...pizza.vegetables.map((name) => ["vegetable", name])
  ];
  for (const [category, name] of checks) {
    const item = items.find((entry) => entry.category === category && entry.name === name);
    if (!item || item.stock < 1) return { available: false, missing: name };
  }
  return { available: true, missing: "" };
}

router.get("/", requireAuth("user"), asyncHandler(async (req, res) => {
  const items = await InventoryItem.find().sort({ position: 1, createdAt: 1 });
  const pizzas = await Pizza.find().sort({ position: 1 });
  const options = { base: [], sauce: [], cheese: [], vegetable: [] };
  items.forEach((item) => {
    options[item.category].push({
      id: item._id,
      name: item.name,
      price: item.price,
      stock: item.stock,
      category: item.category
    });
  });
  res.json({
    pizzas: pizzas.map((pizza) => {
      const stock = availability(pizza, items);
      return {
        id: pizza._id,
        name: pizza.name,
        description: pizza.description,
        tag: pizza.tag,
        price: pizza.price,
        base: pizza.base,
        sauce: pizza.sauce,
        cheese: pizza.cheese,
        vegetables: pizza.vegetables,
        available: stock.available,
        missing: stock.missing
      };
    }),
    options
  });
}));

module.exports = router;
