import mark from "../assets/emids-mark.png";

export default function Logo({ size = "nav", markOnly = false }) {
  const plate = size === "lg" ? 40 : 28;
  const textSize = size === "lg" ? "text-h3" : "text-body-lg";
  return (
    <span className="inline-flex items-center gap-3">
      <img
        src={mark}
        alt="Emids mark"
        className="shrink-0 object-contain"
        style={{ width: plate, height: plate }}
      />
      {!markOnly && (
        <span className={`font-bold uppercase leading-none tracking-tight text-warm ${textSize}`}>
          Emids
        </span>
      )}
    </span>
  );
}
