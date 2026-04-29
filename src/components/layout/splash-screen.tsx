import { useState, useEffect, useRef } from "react";

const MIN_VISIBLE_MS = 720;
const EXIT_MS = 800;

export function SplashScreen({ isLoading }: { isLoading: boolean }) {
  const [out, setOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [minMet, setMinMet] = useState(false);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMinMet(true), MIN_VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!isLoading && minMet && !out) {
      requestAnimationFrame(() => {
        if (brandRef.current) {
          const headerBrand = document.querySelector<HTMLElement>(".app-header__brand");
          if (headerBrand) {
            const br = brandRef.current.getBoundingClientRect();
            const hr = headerBrand.getBoundingClientRect();
            const dx = (hr.left + hr.width / 2) - (br.left + br.width / 2);
            const dy = (hr.top + hr.height / 2) - (br.top + br.height / 2);
            brandRef.current.style.setProperty("--splash-dx", `${dx}px`);
            brandRef.current.style.setProperty("--splash-dy", `${dy}px`);
          }
        }
        setOut(true);
      });

      const t = setTimeout(() => setHidden(true), EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [isLoading, minMet, out]);

  if (hidden) return null;

  return (
    <div className={`splash${out ? " splash--out" : ""}`} aria-hidden="true">
      <div ref={brandRef} className="splash__brand">
        <span className="splash__icon">◎</span>
        <span className="splash__name">NeuroEye</span>
      </div>
    </div>
  );
}
