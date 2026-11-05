import { ORDER_STATUSES } from "../format";

export default function StatusTrack({ status }) {
  const current = Math.max(0, ORDER_STATUSES.indexOf(status));
  return (
    <ol className="track" aria-label="Order status">
      {ORDER_STATUSES.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "wait";
        return (
          <li key={step} className={`track-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="track-dot" />
            <span>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
