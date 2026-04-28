import { useState, useEffect } from "react";

export function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [out, setOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setOut(true);
      const t = setTimeout(() => setHidden(true), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  if (hidden) return null;

  return (
    <div className={`splash${out ? " splash--out" : ""}`} aria-hidden="true">
      <div className="splash__icon">◎</div>
      <div className="splash__brand">
        <span className="splash__name">NeuroEye</span>
        <span className="splash__sub">Log</span>
      </div>
      <div className="splash__progress">
        <div className="splash__bar" />
      </div>
    </div>
  );
}
