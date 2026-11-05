const cron = require("node-cron");
const InventoryItem = require("../models/InventoryItem");
const PendingPayment = require("../models/PendingPayment");
const { appConfig } = require("../utils/config");
const { sendMail, lowStockHtml } = require("../utils/email");
const { restoreLines } = require("../utils/stock");

async function releaseExpired() {
  const stale = await PendingPayment.find({ consumed: false, expiresAt: { $lt: new Date() } });
  for (const pending of stale) {
    const claimed = await PendingPayment.findOneAndDelete({ _id: pending._id, consumed: false });
    if (claimed) await restoreLines(claimed.lines);
  }
}

async function notifyLowStock() {
  const items = await InventoryItem.find({
    alertActive: false,
    $expr: { $lt: ["$stock", "$threshold"] }
  }).sort({ category: 1, name: 1 });
  if (!items.length) return;

  const config = appConfig();
  const text = items
    .map((item) => `${item.name} (${item.category}): ${item.stock} left, threshold ${item.threshold}`)
    .join("\n");
  const result = await sendMail({
    to: config.notifyEmail,
    subject: "Forno inventory is running low",
    text: `${text}\n\nOpen the kitchen desk: ${config.clientUrl}/admin/login`,
    html: lowStockHtml(items, config.clientUrl)
  });

  if (result.delivered || result.skipped) {
    await InventoryItem.updateMany(
      { _id: { $in: items.map((item) => item._id) } },
      { alertActive: true }
    );
  }

  const delivery = result.delivered ? "emailed" : result.skipped ? "logged because SMTP is not configured" : "not sent";
  console.log(`Inventory alert for ${items.map((item) => item.name).join(", ")} -> ${config.notifyEmail} (${delivery})`);
}

function startJobs() {
  let running = false;
  cron.schedule("*/30 * * * * *", async () => {
    if (running) return;
    running = true;
    try {
      await releaseExpired();
      await notifyLowStock();
    } catch (error) {
      console.error("Scheduled job failed:", error.message);
    } finally {
      running = false;
    }
  });
  console.log("Inventory alert job scheduled every 30 seconds");
}

module.exports = { startJobs, notifyLowStock, releaseExpired };
