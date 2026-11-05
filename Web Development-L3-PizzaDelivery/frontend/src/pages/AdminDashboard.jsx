import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_TOKEN, api } from "../api";
import { ORDER_STATUSES, rupees, when } from "../format";

const GROUPS = [
  ["base", "Pizza bases"],
  ["sauce", "Sauces"],
  ["cheese", "Cheeses"],
  ["vegetable", "Vegetables"]
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [panel, setPanel] = useState("inventory");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [overrides, setOverrides] = useState({});
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = "Kitchen · Forno";
  }, []);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      items.forEach((item) => {
        if (!next[item._id] || !next[item._id].dirty) {
          next[item._id] = {
            stock: String(item.stock),
            threshold: String(item.threshold),
            dirty: false
          };
        }
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    setOverrides((current) => {
      const next = { ...current };
      let changed = false;
      orders.forEach((order) => {
        if (next[order._id] && next[order._id] === order.status) {
          delete next[order._id];
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [orders]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [inventoryData, orderData, me] = await Promise.all([
          api("/admin/inventory", { admin: true }),
          api("/admin/orders", { admin: true }),
          api("/admin/me", { admin: true })
        ]);
        if (!active) return;
        setItems(inventoryData.items);
        setOrders(orderData.orders);
        setMeta(me);
        setError("");
      } catch (err) {
        if (!active) return;
        if (err.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN);
          window.location.assign("/admin/login");
          return;
        }
        setError(err.message);
      }
    }

    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  function updateDraft(id, field, value) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value, dirty: true }
    }));
  }

  async function saveItem(item) {
    const draft = drafts[item._id];
    setSaving(item._id);
    setError("");
    setNotice("");
    try {
      const data = await api(`/admin/inventory/${item._id}`, {
        method: "PUT",
        admin: true,
        body: { stock: Number(draft.stock), threshold: Number(draft.threshold) }
      });
      setItems((current) => current.map((entry) => entry._id === item._id ? data.item : entry));
      setDrafts((current) => ({
        ...current,
        [item._id]: { stock: String(data.item.stock), threshold: String(data.item.threshold), dirty: false }
      }));
      setNotice(`${data.item.name} updated.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving("");
    }
  }

  async function changeStatus(order, status) {
    setOverrides((current) => ({ ...current, [order._id]: status }));
    setError("");
    try {
      await api(`/admin/orders/${order._id}/status`, {
        method: "PUT",
        admin: true,
        body: { status }
      });
    } catch (err) {
      setOverrides((current) => {
        const next = { ...current };
        delete next[order._id];
        return next;
      });
      setError(err.message);
    }
  }

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN);
    navigate("/admin/login");
  }

  const low = items.filter((item) => item.stock < item.threshold);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <p className="logo">Forno</p>
        <p className="side-kicker">Kitchen desk</p>
        <nav>
          <button type="button" className={panel === "inventory" ? "side-button is-on" : "side-button"} onClick={() => setPanel("inventory")}>Inventory</button>
          <button type="button" className={panel === "orders" ? "side-button is-on" : "side-button"} onClick={() => setPanel("orders")}>Orders</button>
        </nav>
        <div className="spacer" />
        <p className="side-user">{meta?.admin?.name}</p>
        <button type="button" className="link-button light" onClick={logout}>Sign out</button>
      </aside>
      <main className="admin-main">
        {error ? <p className="banner banner-error">{error}</p> : null}
        {notice ? <p className="banner banner-ok">{notice}</p> : null}

        {panel === "inventory" ? (
          <section>
            <h1>Inventory</h1>
            <p className="lede">
              Stock drops when an order is paid. A check runs every 30 seconds and emails {meta?.notifyEmail || "the admin"} when an item is under its threshold.
              {meta && !meta.smtpReady ? " SMTP is not configured, so that alert is written to the API log instead." : ""}
            </p>
            {low.length ? (
              <p className="banner banner-warn">{low.length} item{low.length === 1 ? "" : "s"} under the alert threshold.</p>
            ) : null}
            {GROUPS.map(([key, label]) => (
              <div key={key}>
                <h2 className="group-title">{label}</h2>
                <div className="table-wrap">
                  <table className="stock-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Level</th>
                        <th>Stock</th>
                        <th>Threshold</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter((item) => item.category === key).map((item) => {
                        const draft = drafts[item._id] || { stock: String(item.stock), threshold: String(item.threshold) };
                        const cap = Math.max(item.threshold * 2, item.stock, 1);
                        const width = Math.min(100, Math.round((item.stock / cap) * 100));
                        const isLow = item.stock < item.threshold;
                        return (
                          <tr key={item._id}>
                            <td>
                              <strong>{item.name}</strong>
                              <small>{rupees(item.price)}{item.alertActive ? " · Alert sent" : ""}</small>
                            </td>
                            <td>
                              <div className="meter" aria-hidden="true">
                                <span className={isLow ? "meter-fill is-low" : "meter-fill"} style={{ width: `${width}%` }} />
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={draft.stock}
                                onChange={(event) => updateDraft(item._id, "stock", event.target.value)}
                                aria-label={`${item.name} stock`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={draft.threshold}
                                onChange={(event) => updateDraft(item._id, "threshold", event.target.value)}
                                aria-label={`${item.name} threshold`}
                              />
                            </td>
                            <td>
                              <button type="button" className="button button-primary button-small" onClick={() => saveItem(item)} disabled={saving === item._id}>
                                {saving === item._id ? "Saving…" : "Update"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <section>
            <div className="section-head">
              <h1>Orders</h1>
              <span className="live-pill">Live</span>
            </div>
            <p className="lede">Change a status here. The customer dashboard picks it up within a few seconds.</p>
            {orders.length === 0 ? <p className="lede">No orders have come in yet.</p> : null}
            <div className="table-wrap">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Pizza</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>{order.orderNumber}</strong>
                        <small>{when(order.createdAt)}</small>
                      </td>
                      <td>
                        {order.user?.name || "Customer"}
                        <small>{order.user?.email}</small>
                      </td>
                      <td>
                        {order.pizzaName} × {order.quantity}
                        <small>{order.base} · {order.sauce} · {order.cheese}{order.vegetables?.length ? ` · ${order.vegetables.join(", ")}` : ""}</small>
                      </td>
                      <td>{rupees(order.amount)}</td>
                      <td>
                        <select
                          value={overrides[order._id] || order.status}
                          onChange={(event) => changeStatus(order, event.target.value)}
                          aria-label={`Status for ${order.orderNumber}`}
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
