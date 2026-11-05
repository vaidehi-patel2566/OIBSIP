const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const InventoryItem = require("../models/InventoryItem");
const Pizza = require("../models/Pizza");

const JALAPENO = "Jalapeños";

function item(category, name, price, position) {
  return { category, name, price, position, stock: 40, threshold: 20, alertActive: false };
}

const inventory = [
  item("base", "Classic Hand Tossed", 120, 1),
  item("base", "Thin Crust", 140, 2),
  item("base", "Wheat Thin Crust", 150, 3),
  item("base", "Pan Crust", 160, 4),
  item("base", "Cheese Burst", 190, 5),
  item("sauce", "Marinara", 30, 1),
  item("sauce", "BBQ", 40, 2),
  item("sauce", "Alfredo", 45, 3),
  item("sauce", "Spicy Arrabbiata", 45, 4),
  item("sauce", "Pesto", 50, 5),
  item("cheese", "Mozzarella", 60, 1),
  item("cheese", "Cheddar", 65, 2),
  item("cheese", "Gouda", 70, 3),
  item("cheese", "Parmesan", 75, 4),
  item("cheese", "Vegan Cheese", 80, 5),
  item("vegetable", "Onions", 15, 1),
  item("vegetable", "Tomatoes", 15, 2),
  item("vegetable", "Sweet Corn", 20, 3),
  item("vegetable", "Bell Peppers", 20, 4),
  item("vegetable", "Spinach", 20, 5),
  item("vegetable", "Mushrooms", 25, 6),
  item("vegetable", "Olives", 25, 7),
  item("vegetable", JALAPENO, 25, 8)
];

const pizzas = [
  {
    name: "Margherita",
    description: "Tomato and mozzarella on a hand-tossed crust.",
    tag: "Classic",
    price: 299,
    base: "Classic Hand Tossed",
    sauce: "Marinara",
    cheese: "Mozzarella",
    vegetables: ["Tomatoes"],
    position: 1
  },
  {
    name: "Meadow Pesto",
    description: "Pesto, spinach, peppers and corn on a wheat crust.",
    tag: "Green",
    price: 349,
    base: "Wheat Thin Crust",
    sauce: "Pesto",
    cheese: "Mozzarella",
    vegetables: ["Spinach", "Bell Peppers", "Sweet Corn"],
    position: 2
  },
  {
    name: "Yard Smoke",
    description: "BBQ sauce, cheddar, onion, mushroom and jalapeño.",
    tag: "Smoky",
    price: 379,
    base: "Pan Crust",
    sauce: "BBQ",
    cheese: "Cheddar",
    vegetables: ["Onions", "Mushrooms", JALAPENO],
    position: 3
  },
  {
    name: "Burst Market",
    description: "Alfredo and gouda in a cheese-burst crust.",
    tag: "Rich",
    price: 429,
    base: "Cheese Burst",
    sauce: "Alfredo",
    cheese: "Gouda",
    vegetables: ["Olives", "Tomatoes", "Sweet Corn"],
    position: 4
  },
  {
    name: "Red Hour",
    description: "Arrabbiata heat with parmesan, onion, pepper and jalapeño.",
    tag: "Hot",
    price: 399,
    base: "Thin Crust",
    sauce: "Spicy Arrabbiata",
    cheese: "Parmesan",
    vegetables: [JALAPENO, "Onions", "Bell Peppers"],
    position: 5
  }
];

async function seed() {
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    const email = (process.env.ADMIN_EMAIL || "admin@forno.test").toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin@12345";
    const name = process.env.ADMIN_NAME || "Kitchen Admin";
    await Admin.create({
      name,
      email,
      password: await bcrypt.hash(password, 10)
    });
    console.log(`Seeded admin account ${email}`);
  }

  if ((await InventoryItem.countDocuments()) === 0) {
    await InventoryItem.insertMany(inventory);
    console.log("Seeded inventory");
  }

  if ((await Pizza.countDocuments()) === 0) {
    await Pizza.insertMany(pizzas);
    console.log("Seeded menu");
  }
}

module.exports = { seed };
