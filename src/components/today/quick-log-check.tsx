export function QuickLogCheck({ color, size = 88 }: { color: string; size?: number }) {
  const circle = Math.round(size * 0.82);
  const icon = Math.round(size * 0.39);
  return (
    <div style={{ width: size, height: size, display: "grid", placeItems: "center" }}>
      <div
        className="anim-pop-in"
        style={{
          width: circle,
          height: circle,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={icon} height={icon} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M5 12.5l4.5 4.5L19 7"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 30,
              animation: "qlDrawCheck 400ms ease-out 130ms forwards",
            }}
          />
        </svg>
      </div>
      <style>{`@keyframes qlDrawCheck { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}
