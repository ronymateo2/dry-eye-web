export function QuickLogCheck({ color }: { color: string }) {
  return (
    <div style={{ width: 88, height: 88, display: "grid", placeItems: "center" }}>
      <div
        className="anim-pop-in"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
          display: "grid",
          placeItems: "center",
        }}
      >
        <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
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
