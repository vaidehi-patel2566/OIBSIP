const mongoose = require("mongoose");
const InventoryItem = require("../models/InventoryItem");
const Pizza = require("../models/Pizza");
const { fail } = require("./http");

function normalizeQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5) {
    throw fail(400, "Quantity must be a whole number from 1 to 5");
  }
  return quantity;
}

async function findItem(category, name) {
  const item = await InventoryItem.findOne({ category, name });
  if (!item) throw fail(400, `${name} is not available`);
  return item;
}

function assertStock(parts, quantity) {
  const short = parts.find((part) => part.item.stock < quantity);
  if (short) throw fail(400, `${short.item.name} has only ${short.item.stock} left`);
}

async function buildQuote(body) {
  const quantity = normalizeQuantity(body.quantity === undefined ? 1 : body.quantity);

  if (body.kind === "variety") {
    if (!mongoose.isValidObjectId(body.pizzaId)) throw fail(400, "Choose a pizza from the menu");
    const pizza = await Pizza.findById(body.pizzaId);
    if (!pizza) throw fail(404, "That pizza is no longer on the menu");
    const base = await findItem("base", pizza.base);
    const sauce = await findItem("sauce", pizza.sauce);
    const cheese = await findItem("cheese", pizza.cheese);
    const vegetables = [];
    for (const name of pizza.vegetables) vegetables.push(await findItem("vegetable", name));
    assertStock(
      [base, sauce, cheese, ...vegetables].map((item) => ({ item })),
      quantity
    );
    return {
      kind: "variety",
      pizzaName: pizza.name,
      description: pizza.description,
      base: pizza.base,
      sauce: pizza.sauce,
      cheese: pizza.cheese,
      vegetables: [...pizza.vegetables],
      quantity,
      amount: pizza.price * quantity,
      breakdown: [{ label: pizza.name, unitPrice: pizza.price }]
    };
  }

  if (body.kind !== "custom") throw fail(400, "Choose a menu pizza or build a custom pizza");

  const base = await findItem("base", String(body.base || "").trim());
  const sauce = await findItem("sauce", String(body.sauce || "").trim());
  const cheese = await findItem("cheese", String(body.cheese || "").trim());
  const names = Array.isArray(body.vegetables)
    ? [...new Set(body.vegetables.filter((name) => typeof name === "string").map((name) => name.trim()))].filter(Boolean)
    : [];
  if (names.length < 1) throw fail(400, "Choose at least one vegetable");
  if (names.length > 8) throw fail(400, "Choose up to 8 vegetables");
  const vegetables = [];
  for (const name of names) vegetables.push(await findItem("vegetable", name));
  const parts = [base, sauce, cheese, ...vegetables];
  assertStock(parts.map((item) => ({ item })), quantity);
  const unit = parts.reduce((sum, item) => sum + item.price, 0);
  return {
    kind: "custom",
    pizzaName: "Custom Pizza",
    description: `${base.name} · ${sauce.name} · ${cheese.name}`,
    base: base.name,
    sauce: sauce.name,
    cheese: cheese.name,
    vegetables: vegetables.map((item) => item.name),
    quantity,
    amount: unit * quantity,
    breakdown: parts.map((item) => ({ label: item.name, unitPrice: item.price }))
  };
}

function linesFromQuote(quote) {
  return [
    { category: "base", name: quote.base, qty: quote.quantity },
    { category: "sauce", name: quote.sauce, qty: quote.quantity },
    { category: "cheese", name: quote.cheese, qty: quote.quantity },
    ...quote.vegetables.map((name) => ({ category: "vegetable", name, qty: quote.quantity }))
  ];
}

module.exports = { buildQuote, linesFromQuote };
