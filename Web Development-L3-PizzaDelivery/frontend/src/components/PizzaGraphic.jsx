export default function PizzaGraphic({ seed = 0, size = "lg" }) {
  return (
    <div className={`pie pie-${seed % 3} ${size === "sm" ? "pie-sm" : ""}`} aria-hidden="true">
      <span className="drop drop-a" />
      <span className="drop drop-b" />
      <span className="drop drop-c" />
      <span className="drop drop-d" />
      <span className="drop drop-e" />
      <span className="leaf" />
    </div>
  );
}
