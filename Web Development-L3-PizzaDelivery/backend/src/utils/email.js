const nodemailer = require("nodemailer");
const { appConfig } = require("./config");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letter(title, body, link, linkLabel) {
  const button = link
    ? `<a href="${escapeHtml(link)}" style="display:inline-block;margin-top:16px;background:#d94b24;color:#fffaf6;text-decoration:none;padding:12px 18px;border-radius:999px">${escapeHtml(linkLabel)}</a>`
    : "";
  return `<div style="font-family:Georgia,serif;background:#f3ecdf;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fffdf9;padding:32px;border-radius:20px">
      <p style="letter-spacing:0.16em;font-size:12px;color:#d94b24;margin:0 0 12px">FORNO</p>
      <h1 style="font-size:28px;color:#241812;margin:0 0 12px">${escapeHtml(title)}</h1>
      <p style="color:#3a2d25;font-size:16px;line-height:1.5;margin:0">${body}</p>
      ${button}
    </div>
  </div>`;
}

function lowStockHtml(items, clientUrl) {
  const rows = items.map((item) => {
    return `<li>${escapeHtml(item.name)} (${escapeHtml(item.category)}): ${item.stock} left, threshold ${item.threshold}</li>`;
  }).join("");
  return letter(
    "Inventory is running low",
    `<ul>${rows}</ul><p>Update the count from the kitchen desk before the next orders go through.</p>`,
    `${clientUrl}/admin/login`,
    "Open the kitchen desk"
  );
}

async function sendMail({ to, subject, text, html }) {
  const config = appConfig();
  if (!config.smtpReady) {
    console.log("\n----- Email kept in the server log (SMTP is not configured) -----");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log("------------------------------------------------------------------\n");
    return { delivered: false, skipped: true };
  }

  try {
    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
    return { delivered: true, skipped: false };
  } catch (error) {
    console.error("Email failed:", error.message);
    return { delivered: false, skipped: false };
  }
}

module.exports = { sendMail, letter, lowStockHtml, escapeHtml };
