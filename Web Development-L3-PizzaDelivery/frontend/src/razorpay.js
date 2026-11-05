function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay checkout")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.dataset.razorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

export function openRazorpay({ keyId, orderId, amount, name, email, description }) {
  return loadRazorpay().then(() => new Promise((resolve, reject) => {
    let settled = false;
    const checkout = new window.Razorpay({
      key: keyId,
      amount,
      currency: "INR",
      name: "Forno",
      description,
      order_id: orderId,
      prefill: { name, email },
      theme: { color: "#d94b24" },
      handler(response) {
        settled = true;
        resolve(response);
      },
      modal: {
        ondismiss() {
          window.setTimeout(() => {
            if (!settled) reject(new Error("Payment was cancelled"));
          }, 400);
        }
      }
    });
    checkout.on("payment.failed", (response) => {
      settled = true;
      reject(new Error(response?.error?.description || "Payment failed"));
    });
    checkout.open();
  }));
}
