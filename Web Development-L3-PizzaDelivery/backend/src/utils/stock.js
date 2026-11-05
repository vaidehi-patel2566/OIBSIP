const InventoryItem = require("../models/InventoryItem");

async function restoreLines(lines) {
  for (const line of lines) {
    await InventoryItem.findOneAndUpdate(
      { category: line.category, name: line.name },
      { $inc: { stock: line.qty } }
    );
  }
}

async function reserveLines(lines) {
  const applied = [];
  try {
    for (const line of lines) {
      const item = await InventoryItem.findOneAndUpdate(
        { category: line.category, name: line.name, stock: { $gte: line.qty } },
        { $inc: { stock: -line.qty } },
        { new: true }
      );
      if (!item) {
        const current = await InventoryItem.findOne({ category: line.category, name: line.name });
        const message = current
          ? `${line.name} has only ${current.stock} left`
          : `${line.name} is not available`;
        const error = new Error(message);
        error.status = 400;
        throw error;
      }
      applied.push(line);
    }
    return applied;
  } catch (error) {
    await restoreLines(applied);
    throw error;
  }
}

module.exports = { reserveLines, restoreLines };
