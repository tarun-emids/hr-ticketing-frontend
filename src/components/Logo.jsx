const E_GLYPH = (
  <svg viewBox="0 0 100 100" aria-hidden className="h-full w-full">
    <g fill="#f2f2f0">
      <rect x="20" y="22" width="15" height="56" />
      <rect x="35" y="22" width="45" height="15" />
      <rect x="35" y="42.5" width="38" height="15" />
      <rect x="35" y="63" width="45" height="15" />
    </g>
  </svg>
);

export default function Logo({ size = "nav" }) {
  const plate = size === "lg" ? 40 : 28;
  const textSize = size === "lg" ? "text-h3" : "text-body-lg";
  return (
    <span className="inline-flex items-center gap-3">
      <span
        aria-hidden
        className="soft-bl teal-gradient flex shrink-0 items-center justify-center"
        style={{ width: plate, height: plate }}
      >
        {E_GLYPH}
      </span>
      <span className={`font-bold uppercase leading-none tracking-tight text-warm ${textSize}`}>
        Emids
      </span>
    </span>
  );
}
