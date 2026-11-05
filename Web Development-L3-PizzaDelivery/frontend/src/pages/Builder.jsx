import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { rupees } from "../format";
import { readBuilder, saveBuilder, saveDraft } from "../storage";

const STEPS = [
  { key: "base", label: "Base", title: "Choose a base", hint: "Five crusts. Pick one." },
  { key: "sauce", label: "Sauce", title: "Choose a sauce", hint: "Five sauces. Pick one." },
  { key: "cheese", label: "Cheese", title: "Choose a cheese type", hint: "One cheese for the whole pie." },
  { key: "vegetable", label: "Vegetables", title: "Choose vegetables", hint: "Select as many as you want." }
];

function emptyChoice() {
  return { base: "", sauce: "", cheese: "", vegetables: [] };
}

function initialBuilder() {
  const saved = readBuilder();
  if (!saved || !saved.choice) return { step: 0, choice: emptyChoice() };
  return {
    step: Number.isInteger(saved.step) ? Math.min(Math.max(saved.step, 0), 3) : 0,
    choice: {
      base: saved.choice.base || "",
      sauce: saved.choice.sauce || "",
      cheese: saved.choice.cheese || "",
      vegetables: Array.isArray(saved.choice.vegetables) ? saved.choice.vegetables : []
    }
  };
}

export default function Builder() {
  const navigate = useNavigate();
  const start = useMemo(() => initialBuilder(), []);
  const [step, setStep] = useState(start.step);
  const [choice, setChoice] = useState(start.choice);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Build a pizza · Forno";
  }, []);

  useEffect(() => {
    let active = true;
    api("/menu")
      .then((data) => {
        if (active) setOptions(data.options);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveBuilder({ step, choice });
  }, [step, choice]);

  const current = STEPS[step];
  const list = options ? options[current.key] : [];
  const canContinue = current.key === "vegetable" ? choice.vegetables.length > 0 : Boolean(choice[current.key]);

  function priceOf(category, name) {
    if (!options) return 0;
    const item = options[category].find((entry) => entry.name === name);
    return item ? item.price : 0;
  }

  const soFar = priceOf("base", choice.base) + priceOf("sauce", choice.sauce) + priceOf("cheese", choice.cheese) + choice.vegetables.reduce((sum, name) => sum + priceOf("vegetable", name), 0);

  function choose(item) {
    if (item.stock < 1) return;
    setError("");
    if (current.key === "vegetable") {
      setChoice((prev) => {
        const selected = prev.vegetables.includes(item.name);
        return {
          ...prev,
          vegetables: selected ? prev.vegetables.filter((name) => name !== item.name) : [...prev.vegetables, item.name]
        };
      });
      return;
    }
    setChoice((prev) => ({ ...prev, [current.key]: item.name }));
  }

  function isSelected(name) {
    if (current.key === "vegetable") return choice.vegetables.includes(name);
    return choice[current.key] === name;
  }

  function continueStep() {
    if (!canContinue) {
      setError(current.key === "vegetable" ? "Choose at least one vegetable" : "Choose one to continue");
      return;
    }
    if (step < 3) {
      setStep(step + 1);
      setError("");
      return;
    }
    saveDraft({
      kind: "custom",
      base: choice.base,
      sauce: choice.sauce,
      cheese: choice.cheese,
      vegetables: choice.vegetables,
      quantity: 1
    });
    navigate("/summary");
  }

  return (
    <div>
      <p className="kicker">Custom pizza</p>
      <div className="page-intro">
        <div>
          <h1>{current.title}</h1>
          <p className="lede">{current.hint}</p>
        </div>
        <p className="so-far">So far {rupees(soFar)}</p>
      </div>

      <ol className="step-bar">
        {STEPS.map((item, index) => (
          <li key={item.key} className={index === step ? "is-on" : index < step ? "is-done" : ""}>
            <button type="button" onClick={() => index <= step && setStep(index)} disabled={index > step}>
              {index + 1}. {item.label}
            </button>
          </li>
        ))}
      </ol>

      {error ? <p className="form-error">{error}</p> : null}
      {!options ? <p className="lede">Loading the pantry…</p> : null}

      <div className="option-grid" key={current.key}>
        {list.map((item) => {
          const selected = isSelected(item.name);
          const out = item.stock < 1;
          return (
            <button
              key={item.id}
              type="button"
              className={selected ? "option-card is-selected" : "option-card"}
              aria-pressed={selected}
              disabled={out}
              onClick={() => choose(item)}
            >
              <span>
                <strong>{item.name}</strong>
                <small>{out ? "Out of stock" : item.stock <= 10 ? `Only ${item.stock} left` : "In stock"}</small>
              </span>
              <em>{rupees(item.price)}</em>
            </button>
          );
        })}
      </div>

      {current.key === "vegetable" ? <p className="lede pick-count">{choice.vegetables.length} selected</p> : null}

      <div className="builder-bar">
        <button type="button" className="button button-ghost" onClick={() => step === 0 ? navigate("/dashboard") : setStep(step - 1)}>
          Back
        </button>
        <button type="button" className="button button-primary" onClick={continueStep} disabled={!canContinue}>
          {step === 3 ? "Review order" : "Next"}
        </button>
      </div>
    </div>
  );
}
