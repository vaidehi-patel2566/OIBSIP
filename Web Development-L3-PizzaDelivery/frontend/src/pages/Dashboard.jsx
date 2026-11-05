import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { USER_TOKEN, api } from "../api";
import { useAuth } from "../auth";
import PizzaGraphic from "../components/PizzaGraphic";
import StatusTrack from "../components/StatusTrack";
import { greeting, rupees, when } from "../format";
import { saveDraft } from "../storage";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const placed = location.state?.placed || "";
  const [pizzas, setPizzas] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const previous = useRef({});

  useEffect(() => {
    document.title = "Menu · Forno";
  }, []);

  useEffect(() => {
    let active = true;
    let loaded = false;

    async function load() {
      try {
        const [menuData, orderData] = await Promise.all([
          api("/menu"),
          api("/orders/mine")
        ]);
        if (!active) return;
        setPizzas(menuData.pizzas);
        setOrders(orderData.orders);
        setError("");
        loaded = true;
      } catch (err) {
        if (!active) return;
        if (err.status === 401) {
          localStorage.removeItem(USER_TOKEN);
          window.location.assign("/");
          return;
        }
        if (!loaded) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const changed = orders.find((order) => previous.current[order._id] && previous.current[order._id] !== order.status);
    orders.forEach((order) => {
      previous.current[order._id] = order.status;
    });
    if (!changed) return undefined;
    setFlash(changed._id);
    const timer = window.setTimeout(() => setFlash(""), 1600);
    return () => window.clearTimeout(timer);
  }, [orders]);

  function orderPizza(pizza) {
    saveDraft({ kind: "variety", pizzaId: pizza.id, quantity: 1 });
    navigate("/summary");
  }

  const first = user?.name?.split(" ")[0] || "there";
  const liveText = orders.map((order) => `${order.orderNumber} ${order.status}`).join(". ");

  return (
    <div>
      <section className="page-intro">
        <div>
          <p className="kicker">The menu</p>
          <h1>{greeting()}, {first}.</h1>
          <p className="lede">House pizzas are on the pass. Or build one from the base up.</p>
        </div>
        <Link to="/build" className="button button-primary">Build a pizza</Link>
      </section>

      {placed ? <p className="banner banner-ok">Order {placed} is in. It starts as Order Received.</p> : null}
      {error ? <p className="banner banner-error">{error}</p> : null}
      <p className="sr-only" aria-live="polite">{liveText}</p>

      <div className="section-head">
        <h2>Your orders</h2>
        <span className="live-pill">Live</span>
      </div>
      {loading ? <p className="lede">Loading the pass…</p> : null}
      {!loading && orders.length === 0 ? <p className="lede">No orders yet. The oven is waiting.</p> : null}
      <div className="order-list">
        {orders.map((order) => (
          <article key={order._id} className={flash === order._id ? "order-card flash" : "order-card"}>
            <div className="order-top">
              <div>
                <p className="order-number">{order.orderNumber}</p>
                <h3>{order.pizzaName}</h3>
                <p className="ingredients">{order.description}</p>
              </div>
              <div className="order-meta">
                <strong>{rupees(order.amount)}</strong>
                <span>{when(order.createdAt)}</span>
              </div>
            </div>
            <StatusTrack status={order.status} />
          </article>
        ))}
      </div>

      <div className="section-head">
        <h2>House pizzas</h2>
      </div>
      <div className="menu-grid">
        {pizzas.map((pizza, index) => (
          <article key={pizza.id} className="pizza-card">
            <div className="card-top">
              <PizzaGraphic seed={index + 1} size="sm" />
              <span className="tag">{pizza.tag}</span>
            </div>
            <h3>{pizza.name}</h3>
            <p className="ingredients">{pizza.description}</p>
            <p className="ingredients">{pizza.base} · {pizza.sauce} · {pizza.cheese}</p>
            <div className="card-foot">
              <span className="price">{rupees(pizza.price)}</span>
              <button
                type="button"
                className="button button-primary"
                disabled={!pizza.available}
                onClick={() => orderPizza(pizza)}
              >
                {pizza.available ? "Order" : "Out of stock"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
